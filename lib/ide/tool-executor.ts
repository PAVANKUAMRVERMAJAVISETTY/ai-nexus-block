import { webSearch } from '@/services/web-search';
import { executeInternalWebsiteSearchTool } from "@/lib/ai/internal-search-tool";
import { executeWebsiteWriteTool } from "@/lib/ai/website-write-tools";
import { executeWebsiteTool } from "@/lib/ai/website-tools";
/**
 * Executes validated tool calls against the existing IDE infrastructure.
 *
 * This module owns no security policy of its own — it is a bridge. Reads go to
 * `ide_project_files` (RLS-scoped). Writes become proposals in the existing
 * `ide_agent_actions` table and are applied only by the existing approval
 * endpoint. Commands are enqueued as runs and executed by the user's own Local
 * Development Agent, exactly as if a human had typed them.
 *
 * Nothing here spawns a process, and nothing here writes a project file.
 */

import { ApiError, byteLength, describeDbError, type AuthedContext } from './api';
import { basename, dirname } from './paths';
import { detectLanguage } from './languages';
import { searchFiles } from './tree';
import { buildProjectIndex, renderIndexForPrompt } from './indexer';
import { loadIndexableFiles } from './index-service';
import { validateCommand } from './agent-protocol';
import { isAgentOnline } from './agent-auth';
import { buildGitArgv, describeGitOperation, validateGitOperation } from './git-protocol';
import { interpretGitError } from './git-parsers';
import type { ToolCall } from '@/lib/ai/tools';
import { AGENT_LIMITS, type ToolResult } from '@/lib/ai/agent-loop';
import type { IdeFile, IdeProject } from '@/types/ide';

/** Bound how much of a file is fed back to the model in one observation. */
const MAX_FILE_CHARS = 24_000;
const MAX_LIST_ENTRIES = 400;

export interface ExecutorContext {
  ctx: AuthedContext;
  project: IdeProject;
  sessionId: string;
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

async function readFile(exec: ExecutorContext, path: string): Promise<IdeFile | null> {
  const { data } = await exec.ctx.supabase
    .from('ide_project_files')
    .select('*')
    .eq('project_id', exec.project.id)
    .eq('file_path', path)
    .maybeSingle();

  return (data as IdeFile | null) ?? null;
}

function renderFile(file: IdeFile): string {
  const content = file.content ?? '';
  const body =
    content.length > MAX_FILE_CHARS
      ? `${content.slice(0, MAX_FILE_CHARS)}\n…[truncated, file is ${content.length} characters]`
      : content;

  return `--- ${file.file_path} (${file.language}, ${file.size} bytes) ---\n${body}`;
}

/* ------------------------------------------------------------------ */
/* Write proposals                                                     */
/* ------------------------------------------------------------------ */

/**
 * Create a pending change proposal.
 *
 * This deliberately reuses `ide_agent_actions` and the existing
 * `/api/ide/actions/[actionId]` approval endpoint, so an agent-authored change
 * goes through exactly the same diff-and-approve gate as any other AI change.
 * There is no second, weaker path.
 */
async function proposeChange(
  exec: ExecutorContext,
  input: {
    title: string;
    summary: string;
    risk: 'low' | 'medium' | 'high';
    operations: {
      type: 'create' | 'update' | 'delete' | 'rename';
      path: string;
      content?: string;
      newPath?: string;
      previousContent?: string | null;
    }[];
  }
): Promise<ToolResult> {
  const beforeState: Record<string, string | null> = {};
  for (const operation of input.operations) {
    const existing = await readFile(exec, operation.path);
    beforeState[operation.path] = existing?.content ?? null;
    operation.previousContent = existing?.content ?? null;
  }

  const { data, error } = await exec.ctx.supabase
    .from('ide_agent_actions')
    .insert({
      project_id: exec.project.id,
      requested_by: exec.ctx.userId,
      session_id: exec.sessionId,
      action_type: 'agent',
      title: input.title,
      summary: input.summary,
      risk: input.risk,
      proposed_change: { operations: input.operations, validationCommand: null },
      files_affected: input.operations.map((o) => o.path),
      before_state: beforeState,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    return { ok: false, content: `Could not create the change proposal: ${describeDbError(error)}` };
  }

  return {
    ok: true,
    content:
      'The change has been proposed and is waiting for the user to review the diff. ' +
      'It has NOT been applied yet.',
    pendingActionId: data.id as string,
  };
}

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

/** Map the project's package.json scripts, for the verification tools. */
async function projectScripts(exec: ExecutorContext): Promise<Record<string, string>> {
  const file = await readFile(exec, 'package.json');
  if (!file?.content) return {};
  try {
    const parsed = JSON.parse(file.content) as { scripts?: Record<string, string> };
    return parsed.scripts ?? {};
  } catch {
    return {};
  }
}

/**
 * Refuse a command outright when no local agent is connected.
 *
 * The system prompt already tells the model not to run commands while the
 * agent is offline, but a prompt is a request, not a guarantee. Without this
 * check a tool call still inserts a `queued` run that nothing will ever claim,
 * and the session sits in `awaiting_command` until the ten-minute timeout —
 * ten minutes of an interface that looks like work is happening.
 *
 * Returning a failed observation instead means the model learns immediately
 * that nothing ran, which is the only honest thing to report.
 */
const TOOLS_REQUIRING_LOCAL_AGENT: ReadonlySet<string> = new Set([
  'terminal_run',
  'test_run',
  'build_run',
  'typecheck_run',
  'lint_run',
  'git_status',
  'git_diff',
  'git_stage',
  'git_commit',
  'git_push',
  'git_pull',
]);

async function refuseIfAgentOffline(
  exec: ExecutorContext,
  tool: string
): Promise<ToolResult | null> {
  if (!TOOLS_REQUIRING_LOCAL_AGENT.has(tool)) return null;
  if (await isAgentOnline(exec.ctx)) return null;

  return {
    ok: false,
    content:
      `Could not run \`${tool}\`: no Nexus Local Development Agent is connected, ` +
      'so nothing was executed. Tell the user the agent is offline and that this ' +
      'step is unverified. Do not describe the command as having run, passed or ' +
      'failed. You can still read files and propose changes.',
  };
}

/**
 * Enqueue a command for the user's local agent.
 * Re-validated against the same allowlist the agent enforces.
 */
async function queueCommand(
  exec: ExecutorContext,
  command: string,
  kind: string
): Promise<ToolResult> {
  try {
    validateCommand(command);
  } catch (error) {
    return {
      ok: false,
      content: error instanceof Error ? error.message : 'That command is not allowed.',
    };
  }

  const { data, error } = await exec.ctx.supabase
    .from('ide_project_runs')
    .insert({
      project_id: exec.project.id,
      user_id: exec.ctx.userId,
      session_id: exec.sessionId,
      command,
      kind,
      status: 'queued',
      triggered_by: 'ai',
    })
    .select('id')
    .single();

  if (error) return { ok: false, content: `Could not queue the command: ${describeDbError(error)}` };

  return {
    ok: true,
    content: `Queued \`${command}\`. Waiting for the local agent to run it.`,
    pendingRunId: data.id as string,
  };
}

/** Enqueue a structured Git operation. */
async function queueGit(
  exec: ExecutorContext,
  operation: Record<string, unknown>
): Promise<ToolResult> {
  let validated;
  try {
    validated = validateGitOperation(operation);
  } catch (error) {
    return {
      ok: false,
      content: error instanceof Error ? error.message : 'That Git operation is not allowed.',
    };
  }

  // Built here purely to fail fast on anything the agent would refuse.
  buildGitArgv(validated);

  const { data, error } = await exec.ctx.supabase
    .from('ide_project_runs')
    .insert({
      project_id: exec.project.id,
      user_id: exec.ctx.userId,
      session_id: exec.sessionId,
      command: describeGitOperation(validated),
      kind: 'git',
      status: 'queued',
      triggered_by: 'ai',
      operation: validated,
    })
    .select('id')
    .single();

  if (error) return { ok: false, content: `Could not queue: ${describeDbError(error)}` };

  return {
    ok: true,
    content: `Queued \`${describeGitOperation(validated)}\`.`,
    pendingRunId: data.id as string,
  };
}

/* ------------------------------------------------------------------ */
/* Polling a queued run                                                */
/* ------------------------------------------------------------------ */

const VERIFICATION_KINDS = new Set(['test', 'build', 'typecheck', 'lint']);

/**
 * Turn a finished run into an observation.
 *
 * Returns `null` while the run is still in flight, which parks the loop.
 * `verificationPassed` is derived from the real exit code — never from anything
 * the model said.
 */
export async function pollRunResult(
  exec: ExecutorContext,
  runId: string
): Promise<ToolResult | null> {
  const { data, error } = await exec.ctx.supabase
    .from('ide_project_runs')
    .select('*')
    .eq('id', runId)
    .eq('user_id', exec.ctx.userId)
    .maybeSingle();

  if (error) throw new ApiError(500, describeDbError(error));
  if (!data) return { ok: false, content: 'That command no longer exists.' };

  const run = data as {
    status: string;
    kind: string;
    command: string;
    stdout: string;
    stderr: string;
    exit_code: number | null;
    duration_ms: number | null;
    created_at: string;
    operation: { op?: string } | null;
    result: { errorExplanation?: string | null } | null;
  };

  if (['queued', 'claimed', 'running'].includes(run.status)) {
    // A run only leaves this state when the local agent reports back. If the
    // agent is offline or died mid-command, nothing ever will — so the loop
    // would park forever. Give up after the timeout and hand the model an
    // observation it can act on, rather than hanging the task.
    const age = Date.now() - new Date(run.created_at).getTime();
    if (age > AGENT_LIMITS.commandTimeoutMs) {
      await exec.ctx.supabase
        .from('ide_project_runs')
        .update({
          status: 'timeout',
          stderr: 'The local agent did not report a result before the timeout.',
          finished_at: new Date().toISOString(),
        })
        .eq('id', runId)
        .eq('user_id', exec.ctx.userId);

      return {
        ok: false,
        content:
          `The command \`${run.command}\` did not finish within ` +
          `${Math.round(AGENT_LIMITS.commandTimeoutMs / 60000)} minutes and was abandoned. ` +
          'The local agent may be offline or the command may have hung. ' +
          'Do NOT assume it succeeded.',
        // Counts as a verification that did not pass, so the loop can neither
        // claim success nor retry indefinitely.
        verificationRan: VERIFICATION_KINDS.has(run.kind),
        verificationPassed: VERIFICATION_KINDS.has(run.kind) ? false : undefined,
      };
    }

    return null;
  }

  const succeeded = run.status === 'success';
  const isVerification = VERIFICATION_KINDS.has(run.kind);

  const stdout = (run.stdout ?? '').slice(-8000);
  const stderr = (run.stderr ?? '').slice(-8000);

  const lines = [
    `Command: ${run.command}`,
    `Status: ${run.status}  Exit code: ${run.exit_code ?? 'n/a'}  Duration: ${run.duration_ms ?? 'n/a'}ms`,
  ];

  if (run.result?.errorExplanation) lines.push(`Note: ${run.result.errorExplanation}`);
  else if (run.operation?.op && !succeeded) {
    const explanation = interpretGitError(stderr, run.exit_code);
    if (explanation) lines.push(`Note: ${explanation}`);
  }

  lines.push('', 'STDOUT:', stdout || '(empty)', '', 'STDERR:', stderr || '(empty)');

  return {
    ok: succeeded,
    content: lines.join('\n'),
    verificationRan: isVerification,
    verificationPassed: isVerification ? succeeded : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

export async function executeToolCall(
  exec: ExecutorContext,
  call: ToolCall
): Promise<ToolResult> {
  const a = call.args;

  // Checked once, here, rather than at each queueing site: the verification
  // tools resolve a package.json script before they queue anything, so a
  // per-callsite check would report "no test script" on a project that simply
  // has no agent listening. One gate keeps the answer the same for every tool.
  const offline = await refuseIfAgentOffline(exec, call.tool);
  if (offline) return offline;

  switch (call.tool) {
    /* ---- reads ---- */


    case 'search_internal_website': {
      const args = call.args;

      return executeInternalWebsiteSearchTool(
        String(args.query),
        (args.entity ?? 'all') as
          | 'tools'
          | 'projects'
          | 'knowledge'
          | 'roadmaps'
          | 'all',
      );
    }


    case 'web_search': {
      const args = call.args;

      const result = await webSearch({
        query: String(args.query),
        maxResults: Number(args.maxResults ?? 5),
      });

      return {
        ok: true,
        content: JSON.stringify(result, null, 2),
      };
    }

    case 'read_tools':
    case 'read_projects':
    case 'read_knowledge':
    case 'read_roadmaps':
      return executeWebsiteTool(call);
    case 'project_list_files': {
      const { data } = await exec.ctx.supabase
        .from('ide_project_files')
        .select('file_path, is_directory, size, language')
        .eq('project_id', exec.project.id)
        .order('file_path')
        .limit(MAX_LIST_ENTRIES);

      const rows = (data ?? []) as { file_path: string; is_directory: boolean; size: number }[];
      if (!rows.length) return { ok: true, content: 'The project has no files yet.' };

      return {
        ok: true,
        content: rows
          .map((r) => (r.is_directory ? `${r.file_path}/` : `${r.file_path} (${r.size}b)`))
          .join('\n'),
      };
    }

    case 'project_overview': {
      const files = await loadIndexableFiles(exec.ctx, exec.project.id);
      const bundle = buildProjectIndex(exec.project, files);
      return { ok: true, content: renderIndexForPrompt(bundle) };
    }

    case 'project_search': {
      const files = await loadIndexableFiles(exec.ctx, exec.project.id);
      const query = String(a.query);
      const limit = Number(a.limit ?? 20);

      const needle = query.toLowerCase();

      // searchFiles ranks by path/filename but returns metadata only, so map
      // its hits back onto the full rows to keep `content` for snippets.
      const byPath = new Map(files.map((f) => [f.file_path, f]));
      const nameHits = searchFiles(files, query, limit)
        .map((f) => byPath.get(f.file_path))
        .filter((f): f is IdeFile => Boolean(f));

      const contentHits = files
        .filter((f) => !f.is_directory && (f.content ?? '').toLowerCase().includes(needle))
        .slice(0, limit);

      const hits = Array.from(
        new Map([...nameHits, ...contentHits].map((f) => [f.file_path, f])).values()
      ).slice(0, limit);

      if (!hits.length) return { ok: true, content: `No matches for "${query}".` };

      return {
        ok: true,
        content: hits
          .map((f) => {
            const content = f.content ?? '';
            const index = content.toLowerCase().indexOf(needle);
            if (index === -1) return `${f.file_path} (filename match)`;
            const line = content.slice(0, index).split('\n').length;
            const snippet = content.slice(Math.max(0, index - 60), index + 120).replace(/\n/g, ' ');
            return `${f.file_path}:${line}  …${snippet}…`;
          })
          .join('\n'),
      };
    }

    case 'project_read_file': {
      const file = await readFile(exec, String(a.path));
      if (!file) return { ok: false, content: `File not found: ${a.path}` };
      return { ok: true, content: renderFile(file) };
    }

    case 'project_read_multiple_files': {
      const paths = a.paths as string[];
      const parts: string[] = [];
      for (const path of paths) {
        const file = await readFile(exec, path);
        parts.push(file ? renderFile(file) : `--- ${path} --- (not found)`);
      }
      return { ok: true, content: parts.join('\n\n') };
    }

    /* ---- write proposals ---- */

    case 'project_create_file': {
      const path = String(a.path);
      if (await readFile(exec, path)) {
        return {
          ok: false,
          content: `${path} already exists. Read it and use project_edit_file instead.`,
        };
      }
      return proposeChange(exec, {
        title: `Create ${basename(path)}`,
        summary: call.reason ?? `Create ${path}`,
        risk: 'low',
        operations: [{ type: 'create', path, content: String(a.content) }],
      });
    }

    case 'project_edit_file': {
      const path = String(a.path);
      const existing = await readFile(exec, path);
      if (!existing) {
        return {
          ok: false,
          content: `${path} does not exist. Use project_create_file to create it.`,
        };
      }
      if ((existing.content ?? '') === a.content) {
        return { ok: false, content: `The proposed content for ${path} is identical to the current file.` };
      }
      return proposeChange(exec, {
        title: `Edit ${basename(path)}`,
        summary: call.reason ?? `Update ${path}`,
        risk: ['package.json', 'tsconfig.json', 'next.config.js', 'middleware.ts'].includes(path)
          ? 'high'
          : 'low',
        operations: [{ type: 'update', path, content: String(a.content) }],
      });
    }

    case 'project_delete_file': {
      const path = String(a.path);
      if (!(await readFile(exec, path))) {
        return { ok: false, content: `${path} does not exist.` };
      }
      return proposeChange(exec, {
        title: `Delete ${basename(path)}`,
        summary: call.reason ?? `Delete ${path}`,
        risk: 'high',
        operations: [{ type: 'delete', path }],
      });
    }

    case 'project_move_file': {
      const path = String(a.path);
      const newPath = String(a.newPath);
      if (!(await readFile(exec, path))) return { ok: false, content: `${path} does not exist.` };
      if (await readFile(exec, newPath)) {
        return { ok: false, content: `${newPath} already exists.` };
      }
      return proposeChange(exec, {
        title: `Move ${basename(path)} → ${basename(newPath)}`,
        summary: call.reason ?? `Move ${path} to ${newPath}`,
        risk: 'medium',
        operations: [{ type: 'rename', path, newPath }],
      });
    }

    /* ---- commands ---- */

    case 'terminal_run': {
      const argv = [String(a.command), ...((a.args as string[]) ?? [])];
      return queueCommand(exec, argv.join(' '), 'custom');
    }

    case 'test_run':
    case 'build_run':
    case 'typecheck_run':
    case 'lint_run': {
      const wanted = call.tool.replace('_run', '');
      const scripts = await projectScripts(exec);

      // Prefer the project's own script; fall back to a direct invocation only
      // when the toolchain makes that unambiguous.
      const scriptName =
        Object.keys(scripts).find((name) => name === wanted) ??
        Object.keys(scripts).find((name) => name.startsWith(wanted));

      if (!scriptName) {
        return {
          ok: false,
          content:
            `This project has no "${wanted}" script in package.json. ` +
            `Available scripts: ${Object.keys(scripts).join(', ') || 'none'}. ` +
            'Use terminal_run if you know the right command.',
        };
      }

      const packageManager = exec.project.package_manager || 'npm';
      const runner = ['npm', 'pnpm', 'yarn', 'bun'].includes(packageManager) ? packageManager : 'npm';

      return queueCommand(exec, `${runner} run ${scriptName}`, wanted);
    }

    /* ---- git ---- */

    case 'git_status':
      return queueGit(exec, { op: 'status' });
    case 'git_diff':
      return queueGit(exec, { op: 'diff', path: a.path ?? null, staged: a.staged === true });
    case 'git_stage':
      return queueGit(exec, { op: 'stage', paths: a.paths });
    case 'git_commit':
      return queueGit(exec, { op: 'commit', message: a.message });
    case 'git_push':
      return queueGit(exec, { op: 'push' });
    case 'git_pull':
      return queueGit(exec, { op: 'pull' });

    /* ---- control ---- */

    case 'finish':
      return {
        ok: true,
        content: 'Task finished.',
        finished: { summary: String(a.summary), success: a.success === true },
      };

    case 'ask_user':
      return { ok: true, content: 'Waiting for the user.', question: String(a.question) };

        case "create_project":
    case "update_project":
    case "delete_project":
    case "create_tool":
    case "update_tool":
    case "delete_tool":
    case "create_knowledge":
    case "update_knowledge":
    case "delete_knowledge":
    case "create_roadmap":
    case "update_roadmap":
    case "delete_roadmap": {
      const result = await executeWebsiteWriteTool(
        call as never
      );

      return {
        ok: result.success,
        content: JSON.stringify(result.data ?? result),
        pendingActionId: result.pendingActionId,
      };
    }
default: {
      const exhaustive: never = call.tool;
      return { ok: false, content: `Unsupported tool: ${String(exhaustive)}` };
    }
  }
}

/** Directory helper kept for symmetry with the file APIs. */
export function parentOf(path: string): string {
  return dirname(path);
}

/** Byte length helper re-exported so callers do not import two modules. */
export { byteLength, detectLanguage };







