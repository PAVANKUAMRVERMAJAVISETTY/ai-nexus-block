/**
 * Persistence and orchestration for agent sessions.
 *
 * Wires the pure loop (`lib/ai/agent-loop.ts`) to the database, the model, and
 * the tool executor. Kept out of the route files so Next's route-export
 * validation is not an obstacle, and so the loop stays unit-testable.
 */

import { ApiError, describeDbError, type AuthedContext } from './api';
import {
  advanceSession,
  createSessionState,
  verificationSummary,
  type AgentPorts,
  type AgentSessionState,
  type TranscriptEntry,
} from '@/lib/ai/agent-loop';
import { buildAgentSystemPrompt } from '@/lib/ai/agent-prompt';
import { generate, NoProviderConfiguredError } from '@/lib/ai/nexus-assistant';
import { executeToolCall, pollRunResult, type ExecutorContext } from './tool-executor';
import { isAgentOnline } from './agent-auth';
import { buildProjectIndex, renderIndexForPrompt } from './indexer';
import { loadIndexableFiles } from './index-service';
import type { IdeProject } from '@/types/ide';

/* ------------------------------------------------------------------ */
/* Row <-> state mapping                                               */
/* ------------------------------------------------------------------ */

export interface AgentSessionRow {
  id: string;
  project_id: string;
  user_id: string;
  goal: string;
  status: string;
  transcript: TranscriptEntry[];
  iterations: number;
  tool_calls: number;
  repair_attempts: number;
  pending_run_id: string | null;
  pending_action_id: string | null;
  pending_question: string | null;
  summary: string | null;
  success: boolean | null;
  error_message: string | null;
  cancel_requested: boolean;
  created_at: string;
  updated_at: string;
}

function rowToState(row: AgentSessionRow): AgentSessionState {
  return {
    goal: row.goal,
    status: row.status as AgentSessionState['status'],
    transcript: Array.isArray(row.transcript) ? row.transcript : [],
    iterations: row.iterations,
    toolCalls: row.tool_calls,
    repairAttempts: row.repair_attempts,
    pendingRunId: row.pending_run_id,
    pendingActionId: row.pending_action_id,
    pendingQuestion: row.pending_question,
    summary: row.summary,
    success: row.success,
    errorMessage: row.error_message,
    cancelRequested: row.cancel_requested,
  };
}

function stateToRow(state: AgentSessionState): Record<string, unknown> {
  const terminal = ['completed', 'failed', 'cancelled'].includes(state.status);

  return {
    status: state.status,
    transcript: state.transcript,
    iterations: state.iterations,
    tool_calls: state.toolCalls,
    repair_attempts: state.repairAttempts,
    pending_run_id: state.pendingRunId,
    pending_action_id: state.pendingActionId,
    pending_question: state.pendingQuestion,
    summary: state.summary,
    success: state.success,
    error_message: state.errorMessage,
    ...(terminal ? { finished_at: new Date().toISOString() } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

export async function loadSession(
  ctx: AuthedContext,
  sessionId: string
): Promise<AgentSessionRow> {
  const { data, error } = await ctx.supabase
    .from('ide_agent_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new ApiError(
        503,
        'The agent session table is not present in your Supabase project. ' +
          'Run database/migrations/20260811000002_nexus_ide_agent_sessions.sql.'
      );
    }
    throw new ApiError(500, describeDbError(error));
  }
  if (!data) throw new ApiError(404, 'Agent session not found.');

  return data as AgentSessionRow;
}

export async function createSession(
  ctx: AuthedContext,
  input: { projectId: string; goal: string; conversationId?: string | null }
): Promise<AgentSessionRow> {
  const state = createSessionState(input.goal);

  const { data, error } = await ctx.supabase
    .from('ide_agent_sessions')
    .insert({
      project_id: input.projectId,
      user_id: ctx.userId,
      conversation_id: input.conversationId ?? null,
      goal: input.goal,
      status: state.status,
      transcript: state.transcript,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new ApiError(
        503,
        'The agent session table is not present in your Supabase project. ' +
          'Run database/migrations/20260811000002_nexus_ide_agent_sessions.sql.'
      );
    }
    throw new ApiError(400, describeDbError(error));
  }

  return data as AgentSessionRow;
}

/* ------------------------------------------------------------------ */
/* Ports                                                               */
/* ------------------------------------------------------------------ */


/**
 * The last few commands this project ran, with their real outcome.
 * Keeps the agent from re-running a check that just ran, and gives it the
 * actual failure text when the user asks "why is this failing?".
 */
async function loadRecentRuns(ctx: AuthedContext, projectId: string): Promise<string | null> {
  const { data } = await ctx.supabase
    .from('ide_project_runs')
    .select('command, status, exit_code, stdout, stderr, created_at')
    .eq('project_id', projectId)
    .not('status', 'in', '("queued","claimed","running")')
    .order('created_at', { ascending: false })
    .limit(3);

  const runs = (data ?? []) as {
    command: string;
    status: string;
    exit_code: number | null;
    stdout: string;
    stderr: string;
  }[];

  if (!runs.length) return null;

  return runs
    .map((run) => {
      const tail = (run.status === 'success' ? run.stdout : run.stderr || run.stdout) ?? '';
      const excerpt = tail.split('\n').filter(Boolean).slice(-12).join('\n');
      return `$ ${run.command}\n  -> ${run.status} (exit ${run.exit_code ?? 'n/a'})${
        excerpt ? `\n${excerpt}` : ''
      }`;
    })
    .join('\n\n');
}

/** Diagnostics from the most recent verification. */
async function loadRecentProblems(ctx: AuthedContext, projectId: string): Promise<string | null> {
  const { data } = await ctx.supabase
    .from('ide_problems')
    .select('severity, file_path, line, code, message')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);

  const problems = (data ?? []) as {
    severity: string;
    file_path: string | null;
    line: number | null;
    code: string | null;
    message: string;
  }[];

  if (!problems.length) return null;

  return problems
    .map(
      (p) =>
        `${p.severity.toUpperCase()} ${p.file_path ?? '(unknown file)'}${
          p.line ? `:${p.line}` : ''
        }${p.code ? ` [${p.code}]` : ''} — ${p.message}`
    )
    .join('\n');
}

/** Branch and changed files from the most recent git status run. */
async function loadGitStatus(ctx: AuthedContext, projectId: string): Promise<string | null> {
  const { data } = await ctx.supabase
    .from('ide_project_runs')
    .select('result, created_at')
    .eq('project_id', projectId)
    .eq('kind', 'git')
    .eq('status', 'success')
    .not('result', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  for (const row of (data ?? []) as { result: { status?: unknown } | null }[]) {
    const status = row.result?.status as
      | { branch?: string; ahead?: number; behind?: number; files?: { path: string; staged: boolean; conflicted: boolean }[] }
      | undefined;
    if (!status) continue;

    const lines = [
      `Branch: ${status.branch ?? 'unknown'}${
        status.ahead ? ` (${status.ahead} ahead)` : ''
      }${status.behind ? ` (${status.behind} behind)` : ''}`,
    ];

    for (const file of (status.files ?? []).slice(0, 30)) {
      lines.push(
        `  ${file.conflicted ? 'CONFLICT' : file.staged ? 'staged' : 'modified'}  ${file.path}`
      );
    }
    return lines.join('\n');
  }

  return null;
}

async function loadLearnerContext(ctx: AuthedContext): Promise<string | null> {
  const { data } = await ctx.supabase
    .from('profiles')
    .select('experience_level, skills, target_roles, learning_goals')
    .eq('id', ctx.userId)
    .maybeSingle();

  if (!data) return null;

  const parts: string[] = [];
  if (data.experience_level) parts.push(`Experience: ${data.experience_level}`);
  if (Array.isArray(data.skills) && data.skills.length) {
    parts.push(`Knows: ${data.skills.join(', ')}`);
  }
  if (data.learning_goals) parts.push(`Learning goals: ${data.learning_goals}`);

  return parts.length ? parts.join('\n') : null;
}

export interface BuildPortsOptions {
  ctx: AuthedContext;
  project: IdeProject;
  sessionId: string;
  activeFilePath?: string | null;
  selection?: string | null;
}

export async function buildPorts(options: BuildPortsOptions): Promise<AgentPorts> {
  const exec: ExecutorContext = {
    ctx: options.ctx,
    project: options.project,
    sessionId: options.sessionId,
  };

  // Assembled once per request rather than per model turn — the project does
  // not change underneath a single advance, and re-indexing per turn would be
  // the dominant cost of the loop.
  const files = await loadIndexableFiles(options.ctx, options.project.id);
  const projectContext = renderIndexForPrompt(buildProjectIndex(options.project, files));
  const [agentOnline, learnerContext, recentRuns, recentProblems, gitStatus] = await Promise.all([
    isAgentOnline(options.ctx),
    loadLearnerContext(options.ctx),
    loadRecentRuns(options.ctx, options.project.id),
    loadRecentProblems(options.ctx, options.project.id),
    loadGitStatus(options.ctx, options.project.id),
  ]);

  const system = buildAgentSystemPrompt({
    projectContext,
    activeFilePath: options.activeFilePath,
    selection: options.selection,
    learnerContext,
    recentRuns,
    recentProblems,
    gitStatus,
    agentOnline,
    gitAvailable: Boolean(options.project.github_repo_full_name),
  });

  return {
    buildSystemPrompt: () => system,

    callModel: async ({ messages }) => {
      const result = await generate({
        message: messages,
        system,
        mode: 'debug_problem',
        maxTokens: 8192,
      });
      return result.content;
    },

    executeTool: (call) => executeToolCall(exec, call),

    pollRun: (runId) => pollRunResult(exec, runId),
  };
}

/* ------------------------------------------------------------------ */
/* Advancing + persisting                                              */
/* ------------------------------------------------------------------ */

export interface AdvanceResult {
  row: AgentSessionRow;
  state: AgentSessionState;
  verifications: { tool: string; passed: boolean }[];
  filesChanged: string[];
}

/** Files the session has actually had applied (not merely proposed). */
async function appliedFiles(ctx: AuthedContext, sessionId: string): Promise<string[]> {
  const { data } = await ctx.supabase
    .from('ide_agent_actions')
    .select('files_affected, status')
    .eq('session_id', sessionId)
    .eq('status', 'applied');

  const files = new Set<string>();
  for (const row of (data ?? []) as { files_affected: string[] }[]) {
    for (const file of row.files_affected ?? []) files.add(file);
  }
  return Array.from(files);
}

/**
 * Advance a session one request's worth and persist the result.
 * Safe to call repeatedly; a parked or terminal session is a no-op.
 */
export async function advanceAndPersist(
  ctx: AuthedContext,
  row: AgentSessionRow,
  project: IdeProject,
  options: { activeFilePath?: string | null; selection?: string | null } = {}
): Promise<AdvanceResult> {
  const state = rowToState(row);

  const terminal = ['completed', 'failed', 'cancelled'].includes(state.status);
  const parked = state.status === 'awaiting_approval' || state.status === 'awaiting_input';

  if (!terminal && !parked) {
    const ports = await buildPorts({
      ctx,
      project,
      sessionId: row.id,
      activeFilePath: options.activeFilePath,
      selection: options.selection,
    });

    try {
      await advanceSession(state, ports, { maxStepsThisCall: 4 });
    } catch (error) {
      state.status = 'failed';
      state.errorMessage =
        error instanceof NoProviderConfiguredError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'The assistant failed unexpectedly.';
    }
  }

  const { data, error } = await ctx.supabase
    .from('ide_agent_sessions')
    .update(stateToRow(state))
    .eq('id', row.id)
    .eq('user_id', ctx.userId)
    .select('*')
    .single();

  if (error) throw new ApiError(400, describeDbError(error));

  return {
    row: data as AgentSessionRow,
    state,
    verifications: verificationSummary(state),
    filesChanged: await appliedFiles(ctx, row.id),
  };
}

/** Persist a state the caller mutated directly (approval / answer resume). */
export async function persistState(
  ctx: AuthedContext,
  sessionId: string,
  state: AgentSessionState
): Promise<AgentSessionRow> {
  const { data, error } = await ctx.supabase
    .from('ide_agent_sessions')
    .update(stateToRow(state))
    .eq('id', sessionId)
    .eq('user_id', ctx.userId)
    .select('*')
    .single();

  if (error) throw new ApiError(400, describeDbError(error));
  return data as AgentSessionRow;
}

export { rowToState };
