/**
 * Nexus AI Assistant — tool protocol.
 *
 * The assistant never emits a command to run. It requests a TYPED tool, and the
 * server maps that request onto the existing, already-secured APIs:
 *
 *   file tools     -> ide_project_files (path-validated)
 *   terminal tools -> the run queue -> the user's Local Development Agent
 *   git tools      -> the structured Git protocol
 *
 * Two properties follow from this design:
 *
 *   1. A model cannot invent a command. `terminal_run` carries a `command` and
 *      an `args` array which are re-validated against the existing allowlist,
 *      and the agent still spawns with `shell: false`. There is no string for
 *      a shell to interpret at any point.
 *
 *   2. A model cannot silently mutate anything. Write tools do not write; they
 *      produce a proposal that flows through the existing approval system.
 *
 * Providers are called over plain HTTP without native function calling, so tool
 * requests travel as a strict fenced JSON block. Parsing and validation are
 * identical for every provider, which keeps the security surface single.
 */

import { allowedCommandBinaries } from '@/config/ide';
import { InvalidPathError, normalizeProjectPath } from '@/lib/ide/paths';

export const TOOL_PROTOCOL_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Tool catalogue                                                      */
/* ------------------------------------------------------------------ */

export type ToolName =
  // read — automatic, no approval
  | 'project_list_files'
  | 'project_search'
  | 'project_read_file'
  | 'project_read_multiple_files'
  | 'project_overview'
  // write — proposal + approval
  | 'project_create_file'
  | 'project_edit_file'
  | 'project_delete_file'
  | 'project_move_file'
  // terminal — through the local agent
  | 'terminal_run'
  | 'test_run'
  | 'build_run'
  | 'typecheck_run'
  | 'lint_run'
  // git — through the structured Git protocol
  | 'git_status'
  | 'git_diff'
  | 'git_stage'
  | 'git_commit'
  | 'git_push'
  | 'git_pull'
  // control
  | 'finish'
  | 'ask_user';

/** How much consent a tool needs before it can take effect. */
export type ApprovalLevel =
  /** Runs immediately. Read-only, no side effects. */
  | 'automatic'
  /** Runs immediately but executes on the user's machine (safe commands only). */
  | 'safe_command'
  /** Produces a proposal; the user must approve a diff. */
  | 'requires_approval'
  /** Requires an explicit, separate confirmation beyond the diff. */
  | 'requires_confirmation';

export interface ToolDefinition {
  name: ToolName;
  description: string;
  approval: ApprovalLevel;
  /** Parameter documentation rendered into the system prompt. */
  parameters: string;
  /** Whether the result must be waited for asynchronously (agent round-trip). */
  asynchronous: boolean;
}

export const TOOLS: ToolDefinition[] = [
  {
    name: 'project_list_files',
    description: 'List every file in the project as a tree. Use this first to orient yourself.',
    approval: 'automatic',
    parameters: 'none',
    asynchronous: false,
  },
  {
    name: 'project_search',
    description:
      'Search file contents and paths for a string. Use this to find where something lives before reading files.',
    approval: 'automatic',
    parameters: '{ "query": string, "limit"?: number }',
    asynchronous: false,
  },
  {
    name: 'project_read_file',
    description: 'Read one file in full. Always read a file before editing it.',
    approval: 'automatic',
    parameters: '{ "path": string }',
    asynchronous: false,
  },
  {
    name: 'project_read_multiple_files',
    description: 'Read several files at once. Cheaper than repeated single reads.',
    approval: 'automatic',
    parameters: '{ "paths": string[] }  (max 10)',
    asynchronous: false,
  },
  {
    name: 'project_overview',
    description:
      'Get the indexed overview: framework, language, package manager, scripts, dependencies, routes, entry points.',
    approval: 'automatic',
    parameters: 'none',
    asynchronous: false,
  },
  {
    name: 'project_create_file',
    description: 'Propose creating a new file. Requires user approval.',
    approval: 'requires_approval',
    parameters: '{ "path": string, "content": string }',
    asynchronous: false,
  },
  {
    name: 'project_edit_file',
    description:
      'Propose replacing a file\'s contents. You MUST have read the file first. Provide the COMPLETE new file, never a fragment.',
    approval: 'requires_approval',
    parameters: '{ "path": string, "content": string }',
    asynchronous: false,
  },
  {
    name: 'project_delete_file',
    description: 'Propose deleting a file. Requires explicit user confirmation.',
    approval: 'requires_confirmation',
    parameters: '{ "path": string }',
    asynchronous: false,
  },
  {
    name: 'project_move_file',
    description: 'Propose renaming or moving a file. Requires user approval.',
    approval: 'requires_approval',
    parameters: '{ "path": string, "newPath": string }',
    asynchronous: false,
  },
  {
    name: 'terminal_run',
    description:
      'Run an allow-listed program on the user\'s machine. Pass the program and its arguments separately — never a shell string.',
    approval: 'safe_command',
    parameters: '{ "command": string, "args": string[] }',
    asynchronous: true,
  },
  {
    name: 'test_run',
    description: 'Run the project test suite and return its real output.',
    approval: 'safe_command',
    parameters: 'none',
    asynchronous: true,
  },
  {
    name: 'build_run',
    description: 'Run the project build and return its real output.',
    approval: 'safe_command',
    parameters: 'none',
    asynchronous: true,
  },
  {
    name: 'typecheck_run',
    description: 'Run type checking and return its real output.',
    approval: 'safe_command',
    parameters: 'none',
    asynchronous: true,
  },
  {
    name: 'lint_run',
    description: 'Run the linter and return its real output.',
    approval: 'safe_command',
    parameters: 'none',
    asynchronous: true,
  },
  {
    name: 'git_status',
    description: 'Get the current branch and changed files.',
    approval: 'safe_command',
    parameters: 'none',
    asynchronous: true,
  },
  {
    name: 'git_diff',
    description: 'Get the diff of working-tree or staged changes.',
    approval: 'safe_command',
    parameters: '{ "path"?: string, "staged"?: boolean }',
    asynchronous: true,
  },
  {
    name: 'git_stage',
    description: 'Stage files for commit.',
    approval: 'safe_command',
    parameters: '{ "paths": string[] }',
    asynchronous: true,
  },
  {
    name: 'git_commit',
    description: 'Commit staged changes. Requires explicit user approval.',
    approval: 'requires_confirmation',
    parameters: '{ "message": string }',
    asynchronous: true,
  },
  {
    name: 'git_push',
    description: 'Push commits to GitHub. Requires explicit user approval.',
    approval: 'requires_confirmation',
    parameters: 'none',
    asynchronous: true,
  },
  {
    name: 'git_pull',
    description: 'Pull changes from the remote (fast-forward only).',
    approval: 'safe_command',
    parameters: 'none',
    asynchronous: true,
  },
  {
    name: 'finish',
    description:
      'End the task. Use this ONLY when the work is complete or you cannot continue. Summarize what changed and what verification actually ran.',
    approval: 'automatic',
    parameters: '{ "summary": string, "success": boolean }',
    asynchronous: false,
  },
  {
    name: 'ask_user',
    description:
      'Stop and ask the user a question when the request is ambiguous or you need a decision only they can make.',
    approval: 'automatic',
    parameters: '{ "question": string }',
    asynchronous: false,
  },
];

const TOOL_BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_BY_NAME.get(name as ToolName);
}

export function isWriteTool(name: ToolName): boolean {
  const tool = getTool(name);
  return tool?.approval === 'requires_approval' || tool?.approval === 'requires_confirmation';
}

/* ------------------------------------------------------------------ */
/* Validated tool call                                                 */
/* ------------------------------------------------------------------ */

export interface ToolCall {
  tool: ToolName;
  args: Record<string, unknown>;
  /** Model's stated reason. Displayed to the user as tool activity. */
  reason?: string;
}

export class InvalidToolCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidToolCallError';
  }
}

const MAX_CONTENT_BYTES = 512 * 1024;
const MAX_READ_PATHS = 10;
const MAX_ARG_COUNT = 24;
const MAX_ARG_LENGTH = 200;

function requireString(args: Record<string, unknown>, key: string, max = 400): string {
  const value = args[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new InvalidToolCallError(`"${key}" is required and must be a non-empty string.`);
  }
  if (value.length > max) {
    throw new InvalidToolCallError(`"${key}" exceeds ${max} characters.`);
  }
  return value;
}

function validPath(value: unknown, key = 'path'): string {
  try {
    return normalizeProjectPath(value);
  } catch (error) {
    const detail = error instanceof InvalidPathError ? error.message : 'invalid path';
    throw new InvalidToolCallError(`"${key}" is not a safe project path: ${detail}`);
  }
}

/**
 * Validate a tool call from the model.
 *
 * Everything the model produces is untrusted. Paths go through the same
 * validator as user input, and `terminal_run` is checked against the same
 * allowlist the local agent enforces, so a model cannot widen its own
 * permissions by asking nicely.
 */
export function validateToolCall(raw: unknown): ToolCall {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new InvalidToolCallError('A tool call must be a JSON object.');
  }

  const input = raw as Record<string, unknown>;
  const name = input.tool;

  if (typeof name !== 'string') {
    throw new InvalidToolCallError('A tool call must name a tool.');
  }

  const definition = getTool(name);
  if (!definition) {
    throw new InvalidToolCallError(
      `Unknown tool "${name}". Available tools: ${TOOLS.map((t) => t.name).join(', ')}.`
    );
  }

  const rawArgs = input.args;
  const args: Record<string, unknown> =
    rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs)
      ? (rawArgs as Record<string, unknown>)
      : {};

  const reason = typeof input.reason === 'string' ? input.reason.slice(0, 300) : undefined;
  const validated: Record<string, unknown> = {};

  switch (definition.name) {
    case 'project_list_files':
    case 'project_overview':
    case 'test_run':
    case 'build_run':
    case 'typecheck_run':
    case 'lint_run':
    case 'git_status':
    case 'git_push':
    case 'git_pull':
      break;

    case 'project_search':
      validated.query = requireString(args, 'query', 200);
      validated.limit =
        typeof args.limit === 'number' && Number.isFinite(args.limit)
          ? Math.min(Math.max(Math.floor(args.limit), 1), 50)
          : 20;
      break;

    case 'project_read_file':
      validated.path = validPath(args.path);
      break;

    case 'project_read_multiple_files': {
      if (!Array.isArray(args.paths) || args.paths.length === 0) {
        throw new InvalidToolCallError('"paths" must be a non-empty array.');
      }
      if (args.paths.length > MAX_READ_PATHS) {
        throw new InvalidToolCallError(`"paths" is limited to ${MAX_READ_PATHS} entries.`);
      }
      validated.paths = args.paths.map((p) => validPath(p, 'paths'));
      break;
    }

    case 'project_create_file':
    case 'project_edit_file': {
      validated.path = validPath(args.path);
      if (typeof args.content !== 'string') {
        throw new InvalidToolCallError('"content" must be a string containing the complete file.');
      }
      if (new TextEncoder().encode(args.content).length > MAX_CONTENT_BYTES) {
        throw new InvalidToolCallError(`"content" exceeds ${MAX_CONTENT_BYTES / 1024}KB.`);
      }
      // A placeholder would silently truncate the user's file on apply.
      if (/^\s*(\/\/|#|\/\*)?\s*\.\.\.\s*(rest of|remaining|unchanged|existing)/im.test(args.content)) {
        throw new InvalidToolCallError(
          'The content contains an ellipsis placeholder instead of the complete file. ' +
            'Provide the entire file — applying a placeholder would delete the rest of it.'
        );
      }
      validated.content = args.content;
      break;
    }

    case 'project_delete_file':
      validated.path = validPath(args.path);
      break;

    case 'project_move_file':
      validated.path = validPath(args.path);
      validated.newPath = validPath(args.newPath, 'newPath');
      break;

    case 'terminal_run': {
      const command = requireString(args, 'command', 60);

      // Same allowlist the agent enforces. Checked here so an invalid request
      // is refused with an explanation the model can learn from, rather than
      // failing opaquely later.
      if (!(allowedCommandBinaries as readonly string[]).includes(command)) {
        throw new InvalidToolCallError(
          `"${command}" is not an allowed program. Allowed: ${allowedCommandBinaries.join(', ')}.`
        );
      }
      if (command.includes('/') || command.includes('..')) {
        throw new InvalidToolCallError('The command must name a program, not a path.');
      }

      const rawArgv = args.args;
      if (rawArgv !== undefined && !Array.isArray(rawArgv)) {
        throw new InvalidToolCallError('"args" must be an array of strings.');
      }
      const argv = (rawArgv ?? []) as unknown[];
      if (argv.length > MAX_ARG_COUNT) {
        throw new InvalidToolCallError(`"args" is limited to ${MAX_ARG_COUNT} entries.`);
      }

      validated.command = command;
      validated.args = argv.map((entry) => {
        if (typeof entry !== 'string') {
          throw new InvalidToolCallError('Every entry in "args" must be a string.');
        }
        if (entry.length > MAX_ARG_LENGTH) {
          throw new InvalidToolCallError(`An argument exceeds ${MAX_ARG_LENGTH} characters.`);
        }
        // Traversal in an argument could reach outside the workspace.
        if (entry.includes('..')) {
          throw new InvalidToolCallError('Arguments must not contain "..".');
        }
        if (entry.includes('\u0000')) {
          throw new InvalidToolCallError('Arguments must not contain null bytes.');
        }
        return entry;
      });
      break;
    }

    case 'git_diff':
      if (args.path !== undefined && args.path !== null) validated.path = validPath(args.path);
      validated.staged = args.staged === true;
      break;

    case 'git_stage': {
      if (!Array.isArray(args.paths) || args.paths.length === 0) {
        throw new InvalidToolCallError('"paths" must be a non-empty array.');
      }
      validated.paths = args.paths.map((p) => validPath(p, 'paths'));
      break;
    }

    case 'git_commit':
      validated.message = requireString(args, 'message', 5000);
      break;

    case 'finish':
      validated.summary = requireString(args, 'summary', 4000);
      validated.success = args.success === true;
      break;

    case 'ask_user':
      validated.question = requireString(args, 'question', 1000);
      break;

    default: {
      const exhaustive: never = definition.name;
      throw new InvalidToolCallError(`Unhandled tool ${String(exhaustive)}.`);
    }
  }

  return { tool: definition.name, args: validated, reason };
}

/* ------------------------------------------------------------------ */
/* Parsing model output                                                */
/* ------------------------------------------------------------------ */

export interface ParsedTurn {
  /** Prose the assistant wrote, with the tool block removed. */
  message: string;
  /** The tool the assistant wants to use, if any. */
  toolCall: ToolCall | null;
  /** Set when a tool block was present but unusable. */
  parseError: string | null;
}

const TOOL_BLOCK = /```nexus-tool\s*\n([\s\S]*?)```/;

/**
 * Extract a tool call from a model turn.
 *
 * A malformed block is reported rather than thrown: the loop feeds the error
 * back to the model as an observation so it can correct itself, which is far
 * more useful than aborting the task.
 */
export function parseAssistantTurn(response: string): ParsedTurn {
  const match = TOOL_BLOCK.exec(response);

  if (!match) {
    return { message: response.trim(), toolCall: null, parseError: null };
  }

  const message = response.replace(TOOL_BLOCK, '').trim();

  let raw: unknown;
  try {
    raw = JSON.parse(match[1].trim());
  } catch {
    return {
      message,
      toolCall: null,
      parseError: 'The tool block was not valid JSON. Emit a single valid JSON object.',
    };
  }

  try {
    return { message, toolCall: validateToolCall(raw), parseError: null };
  } catch (error) {
    return {
      message,
      toolCall: null,
      parseError:
        error instanceof InvalidToolCallError ? error.message : 'The tool call was invalid.',
    };
  }
}

/** Render the tool catalogue for the system prompt. */
export function renderToolCatalogue(): string {
  return TOOLS.map(
    (tool) =>
      `- ${tool.name} — ${tool.description}\n  args: ${tool.parameters}${
        tool.approval === 'requires_approval'
          ? '\n  (needs user approval)'
          : tool.approval === 'requires_confirmation'
            ? '\n  (needs explicit user confirmation)'
            : ''
      }`
  ).join('\n');
}

/** Short label for the tool-activity feed in the UI. */
export function describeToolCall(call: ToolCall): string {
  const a = call.args;
  switch (call.tool) {
    case 'project_list_files':
      return 'Listing project files';
    case 'project_overview':
      return 'Reading project overview';
    case 'project_search':
      return `Searching for "${String(a.query)}"`;
    case 'project_read_file':
      return `Reading ${String(a.path)}`;
    case 'project_read_multiple_files':
      return `Reading ${(a.paths as string[]).length} files`;
    case 'project_create_file':
      return `Creating ${String(a.path)}`;
    case 'project_edit_file':
      return `Editing ${String(a.path)}`;
    case 'project_delete_file':
      return `Deleting ${String(a.path)}`;
    case 'project_move_file':
      return `Moving ${String(a.path)} → ${String(a.newPath)}`;
    case 'terminal_run':
      return `Running ${String(a.command)} ${((a.args as string[]) ?? []).join(' ')}`.trim();
    case 'test_run':
      return 'Running tests';
    case 'build_run':
      return 'Running build';
    case 'typecheck_run':
      return 'Running typecheck';
    case 'lint_run':
      return 'Running lint';
    case 'git_status':
      return 'Checking git status';
    case 'git_diff':
      return 'Reading git diff';
    case 'git_stage':
      return `Staging ${(a.paths as string[]).length} file(s)`;
    case 'git_commit':
      return 'Committing';
    case 'git_push':
      return 'Pushing to GitHub';
    case 'git_pull':
      return 'Pulling from remote';
    case 'finish':
      return 'Finishing';
    case 'ask_user':
      return 'Asking a question';
    default:
      return call.tool;
  }
}
