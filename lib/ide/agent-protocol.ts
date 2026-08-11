/**
 * Nexus Local Development Agent — wire protocol and command validation.
 *
 * ARCHITECTURE
 *
 *   Browser (Nexus Web IDE)
 *        |  authenticated user session (Supabase cookie)
 *        v
 *   Next.js server  ──► queues a run row, never executes anything
 *        ^
 *        |  device token (Bearer), never a user session
 *        |
 *   Nexus Local Development Agent  ──► spawns the process on the user's machine
 *        |
 *        v
 *   Project workspace on local disk
 *
 * The browser can only ever *enqueue* work. The Next.js server has no code path
 * that spawns a child process. Execution happens exclusively inside the agent
 * that the user chose to run on their own machine, and the agent re-validates
 * every command it receives before running it.
 *
 * This module is imported by both the server and the reference agent, so it
 * must stay dependency-free and side-effect-free.
 */

import { allowedCommandBinaries, elevatedCommandPatterns } from '@/config/ide';
import type { IdeRunKind } from '@/types/ide';

export const AGENT_PROTOCOL_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Wire messages                                                       */
/* ------------------------------------------------------------------ */

/** Agent → server, on every poll. */
export interface AgentPollRequest {
  protocolVersion: number;
  platform: string;
  agentVersion: string;
  workspaceRoot: string;
  /** How many runs the agent can accept right now. */
  capacity: number;
}

export interface AgentRunAssignment {
  runId: string;
  projectId: string;
  projectName: string;
  /** Directory name the agent should use beneath its workspace root. */
  workspaceDir: string;
  command: string;
  /** Pre-tokenized argv, so the agent never needs a shell to parse it. */
  argv: string[];
  kind: IdeRunKind;
  timeoutMs: number;

  /**
   * Structured Git operation, when this run is a Git operation.
   *
   * Git cannot use the `command`/`argv` string path because shell
   * metacharacters are legitimate inside commit messages. The agent rebuilds
   * argv from these typed fields instead — see lib/ide/git-protocol.ts.
   */
  gitOperation?: GitOperationPayload | null;

  /**
   * Short-lived credential for a network Git operation.
   *
   * Attached at hand-off only; never persisted on the queue row. The agent
   * passes it through the environment, never as a command argument and never
   * into .git/config.
   */
  gitCredential?: { username: string; token: string } | null;

  /** Whether the workspace should be materialized before running. */
  syncWorkspace?: boolean;
}

/** Mirror of the validated GitOperation, kept loose to avoid a circular import. */
export interface GitOperationPayload {
  op: string;
  [key: string]: unknown;
}

export interface AgentPollResponse {
  protocolVersion: number;
  deviceId: string;
  runs: AgentRunAssignment[];
  /** Runs the user asked to cancel since the last poll. */
  cancellations: string[];
}

/** Server → agent: everything needed to materialize a workspace on disk. */
export interface AgentWorkspaceFile {
  path: string;
  content: string;
  isDirectory: boolean;
}

export interface AgentWorkspaceResponse {
  projectId: string;
  projectName: string;
  workspaceDir: string;
  files: AgentWorkspaceFile[];
  truncated: boolean;
}

export type AgentReportEvent =
  | { runId: string; event: 'started' }
  | { runId: string; event: 'output'; stream: 'stdout' | 'stderr'; chunk: string; seq: number }
  | {
      runId: string;
      event: 'finished';
      exitCode: number | null;
      status: 'success' | 'error' | 'cancelled' | 'timeout';
      durationMs: number;
      stdout: string;
      stderr: string;
    };

/* ------------------------------------------------------------------ */
/* Command validation                                                  */
/* ------------------------------------------------------------------ */

export class UnsafeCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeCommandError';
  }
}

/**
 * Characters that only matter when a shell interprets the string. The agent
 * spawns without a shell, but rejecting them anyway keeps the queue readable
 * and blocks attempts to smuggle a second command past the allowlist.
 */
const SHELL_METACHARACTERS = /[;&|`$(){}<>\n\r\\]/;

/**
 * Split a command into argv, honouring single and double quotes.
 * Throws on an unterminated quote rather than guessing the user's intent.
 */
export function tokenizeCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let hasContent = false;

  for (const char of command) {
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      hasContent = true;
      continue;
    }

    if (char === ' ' || char === '\t') {
      if (hasContent) {
        tokens.push(current);
        current = '';
        hasContent = false;
      }
      continue;
    }

    current += char;
    hasContent = true;
  }

  if (quote) {
    throw new UnsafeCommandError('Command has an unterminated quote.');
  }
  if (hasContent) tokens.push(current);

  return tokens;
}

export interface ValidatedCommand {
  command: string;
  argv: string[];
  binary: string;
  kind: IdeRunKind;
  /** True when the UI must ask for a second, explicit confirmation. */
  requiresElevatedConfirmation: boolean;
}

/**
 * Validate a command string against the allowlist.
 *
 * Enforced on the server before a run is queued AND again inside the agent
 * before the process is spawned, so a compromised server still cannot make an
 * agent run an arbitrary binary.
 */
export function validateCommand(rawCommand: unknown): ValidatedCommand {
  if (typeof rawCommand !== 'string') {
    throw new UnsafeCommandError('Command must be a string.');
  }

  const command = rawCommand.trim();

  if (!command) {
    throw new UnsafeCommandError('Command must not be empty.');
  }
  if (command.length > 500) {
    throw new UnsafeCommandError('Command exceeds 500 characters.');
  }
  if (command.includes('\0')) {
    throw new UnsafeCommandError('Command must not contain null bytes.');
  }
  if (SHELL_METACHARACTERS.test(command)) {
    throw new UnsafeCommandError(
      'Command contains shell metacharacters. Run one program at a time — pipes, redirects and chaining are not permitted.'
    );
  }

  const argv = tokenizeCommand(command);
  if (!argv.length) {
    throw new UnsafeCommandError('Command must not be empty.');
  }

  const binary = argv[0];
  if (!(allowedCommandBinaries as readonly string[]).includes(binary)) {
    throw new UnsafeCommandError(
      `"${binary}" is not an allowed program. Allowed: ${allowedCommandBinaries.join(', ')}.`
    );
  }

  // A relative or absolute path would sidestep the allowlist entirely.
  if (binary.includes('/') || binary.includes('..')) {
    throw new UnsafeCommandError('Command must name a program, not a path.');
  }

  for (const arg of argv.slice(1)) {
    if (arg.includes('..')) {
      throw new UnsafeCommandError('Command arguments must not contain "..".');
    }
  }

  return {
    command,
    argv,
    binary,
    kind: classifyCommand(argv),
    requiresElevatedConfirmation: elevatedCommandPatterns.some((pattern) => pattern.test(command)),
  };
}

/** Best-effort classification so the UI can label and group runs. */
export function classifyCommand(argv: string[]): IdeRunKind {
  const [binary, ...rest] = argv;

  if (binary === 'git') return 'git';

  const joined = rest.join(' ');

  if (binary === 'npm' || binary === 'pnpm' || binary === 'yarn' || binary === 'bun') {
    if (rest[0] === 'install' || rest[0] === 'i' || rest[0] === 'ci' || rest[0] === 'add') {
      return 'install';
    }
    if (joined.includes('typecheck') || joined.includes('type-check')) return 'typecheck';
    if (joined.includes('build')) return 'build';
    if (joined.includes('test')) return 'test';
    if (joined.includes('lint')) return 'lint';
    if (joined.includes('dev') || joined.includes('start')) return 'dev';
  }

  if (binary === 'tsc') return 'typecheck';
  if (binary === 'eslint') return 'lint';
  if (binary === 'vitest' || binary === 'jest' || binary === 'pytest' || binary === 'playwright') {
    return 'test';
  }
  if (binary === 'pip' || binary === 'mvn' || binary === 'gradle') {
    return joined.includes('install') ? 'install' : 'build';
  }

  return 'custom';
}

/* ------------------------------------------------------------------ */
/* Device tokens                                                       */
/* ------------------------------------------------------------------ */

export const AGENT_TOKEN_PREFIX = 'nxa_';

/** A device is considered online if it polled within this window. */
export const AGENT_ONLINE_WINDOW_MS = 30_000;

/** Extract a bearer token from an Authorization header. */
export function parseBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;
  const token = match[1].trim();
  return token || null;
}
