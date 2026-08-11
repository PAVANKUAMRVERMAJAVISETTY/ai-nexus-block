/**
 * Structured Git operation protocol.
 *
 * WHY THIS EXISTS RATHER THAN REUSING THE COMMAND STRING PATH
 *
 * `validateCommand()` rejects shell metacharacters, which is correct for
 * free-form commands. But `&`, `;`, `$`, backticks and `|` are all legitimate
 * inside a commit message, so routing `git commit -m "fix: A & B"` through that
 * validator rejects most real commit messages.
 *
 * Loosening the validator would be the wrong fix: it would mean parsing
 * attacker-influenced text and hoping the quoting is right. Instead, Git
 * operations are described as typed data. User text (commit messages, branch
 * names, paths) travels in dedicated fields and is NEVER concatenated into a
 * command string. The agent turns the operation into an argv array itself and
 * spawns without a shell, so there is nothing to escape and nothing to inject.
 *
 * Both sides validate: the server before queueing, the agent before spawning.
 */

import { normalizeProjectPath, InvalidPathError } from './paths';

export const GIT_PROTOCOL_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Operation types                                                     */
/* ------------------------------------------------------------------ */

export type GitOperationType =
  | 'clone'
  | 'status'
  | 'branch_list'
  | 'branch_create'
  | 'branch_switch'
  | 'branch_delete'
  | 'stage'
  | 'unstage'
  | 'discard'
  | 'commit'
  | 'push'
  | 'pull'
  | 'fetch'
  | 'diff'
  | 'log';

export interface GitCloneOperation {
  op: 'clone';
  /** https://github.com/owner/repo — validated, GitHub only. */
  repoUrl: string;
  branch?: string | null;
  /** Set by the server immediately before hand-off; never persisted. */
  credential?: GitCredential | null;
}

export interface GitStatusOperation { op: 'status' }
export interface GitBranchListOperation { op: 'branch_list' }
export interface GitBranchCreateOperation { op: 'branch_create'; branch: string; from?: string | null }
export interface GitBranchSwitchOperation { op: 'branch_switch'; branch: string }
export interface GitBranchDeleteOperation { op: 'branch_delete'; branch: string; force?: boolean }
export interface GitStageOperation { op: 'stage'; paths: string[] }
export interface GitUnstageOperation { op: 'unstage'; paths: string[] }
export interface GitDiscardOperation { op: 'discard'; paths: string[] }
export interface GitCommitOperation { op: 'commit'; message: string }
export interface GitPushOperation { op: 'push'; branch?: string | null; setUpstream?: boolean; credential?: GitCredential | null }
export interface GitPullOperation { op: 'pull'; branch?: string | null; credential?: GitCredential | null }
export interface GitFetchOperation { op: 'fetch'; credential?: GitCredential | null }
export interface GitDiffOperation { op: 'diff'; path?: string | null; staged?: boolean }
export interface GitLogOperation { op: 'log'; limit?: number }

export type GitOperation =
  | GitCloneOperation
  | GitStatusOperation
  | GitBranchListOperation
  | GitBranchCreateOperation
  | GitBranchSwitchOperation
  | GitBranchDeleteOperation
  | GitStageOperation
  | GitUnstageOperation
  | GitDiscardOperation
  | GitCommitOperation
  | GitPushOperation
  | GitPullOperation
  | GitFetchOperation
  | GitDiffOperation
  | GitLogOperation;

/**
 * Credential handed to the agent for a single network operation.
 * Injected at hand-off, never stored in the queue row, never logged.
 */
export interface GitCredential {
  /** Always 'x-access-token' for a GitHub OAuth token. */
  username: string;
  token: string;
}

export class InvalidGitOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidGitOperationError';
  }
}

/* ------------------------------------------------------------------ */
/* Field validation                                                    */
/* ------------------------------------------------------------------ */

export const MAX_COMMIT_MESSAGE_LENGTH = 5000;
export const MAX_BRANCH_NAME_LENGTH = 255;
export const MAX_PATHS_PER_OPERATION = 500;

/**
 * Git's own rules (git-check-ref-format) plus a leading-dash guard so a branch
 * name can never be mistaken for a command-line option.
 */
export function validateBranchName(input: unknown): string {
  if (typeof input !== 'string') throw new InvalidGitOperationError('Branch name must be a string.');

  const branch = input.trim();

  if (!branch) throw new InvalidGitOperationError('Branch name must not be empty.');
  if (branch.length > MAX_BRANCH_NAME_LENGTH) {
    throw new InvalidGitOperationError(`Branch name exceeds ${MAX_BRANCH_NAME_LENGTH} characters.`);
  }
  // A name beginning with '-' would be parsed by git as a flag.
  if (branch.startsWith('-')) {
    throw new InvalidGitOperationError('Branch name must not start with "-".');
  }
  if (branch.startsWith('/') || branch.endsWith('/')) {
    throw new InvalidGitOperationError('Branch name must not start or end with "/".');
  }
  if (branch.endsWith('.') || branch.endsWith('.lock')) {
    throw new InvalidGitOperationError('Branch name must not end with "." or ".lock".');
  }
  if (branch.includes('..') || branch.includes('//') || branch.includes('@{')) {
    throw new InvalidGitOperationError('Branch name contains an invalid sequence.');
  }
  // Control characters, whitespace, and the characters git forbids outright.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0020~^:?*\[\\]/.test(branch)) {
    throw new InvalidGitOperationError('Branch name contains an invalid character.');
  }

  return branch;
}

/**
 * Commit messages are free text — that is the whole point of this protocol.
 * Only control characters that could corrupt the argv boundary are rejected;
 * `&`, `;`, `$`, backticks and quotes are all preserved verbatim.
 */
export function validateCommitMessage(input: unknown): string {
  if (typeof input !== 'string') {
    throw new InvalidGitOperationError('Commit message must be a string.');
  }

  const message = input.trim();

  if (!message) {
    throw new InvalidGitOperationError('Commit message must not be empty.');
  }
  if (message.length > MAX_COMMIT_MESSAGE_LENGTH) {
    throw new InvalidGitOperationError(
      `Commit message exceeds ${MAX_COMMIT_MESSAGE_LENGTH} characters.`
    );
  }
  if (message.includes('\u0000')) {
    throw new InvalidGitOperationError('Commit message must not contain null bytes.');
  }

  return message;
}

/** Repository URLs are restricted to GitHub over HTTPS. */
export function validateRepoUrl(input: unknown): string {
  if (typeof input !== 'string' || !input.trim()) {
    throw new InvalidGitOperationError('Repository URL is required.');
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new InvalidGitOperationError('Repository URL is not a valid URL.');
  }

  if (url.protocol !== 'https:') {
    throw new InvalidGitOperationError('Repository URL must use HTTPS.');
  }
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
    throw new InvalidGitOperationError('Only github.com repositories are supported.');
  }
  // Credentials embedded in the URL would end up in .git/config on disk.
  if (url.username || url.password) {
    throw new InvalidGitOperationError('Repository URL must not embed credentials.');
  }

  const segments = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '').split('/');
  if (segments.length !== 2 || !segments[0] || !segments[1]) {
    throw new InvalidGitOperationError('Repository URL must be https://github.com/owner/repo.');
  }
  if (!/^[\w.-]+$/.test(segments[0]) || !/^[\w.-]+$/.test(segments[1])) {
    throw new InvalidGitOperationError('Repository owner or name contains invalid characters.');
  }

  return `https://github.com/${segments[0]}/${segments[1]}.git`;
}

/** Paths reuse the project path validator, so traversal is impossible. */
export function validatePaths(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new InvalidGitOperationError('At least one file path is required.');
  }
  if (input.length > MAX_PATHS_PER_OPERATION) {
    throw new InvalidGitOperationError(
      `Too many paths (limit ${MAX_PATHS_PER_OPERATION}).`
    );
  }

  return input.map((entry) => {
    try {
      return normalizeProjectPath(entry);
    } catch (error) {
      const detail = error instanceof InvalidPathError ? error.message : 'invalid path';
      throw new InvalidGitOperationError(`Unsafe path in operation: ${detail}`);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Operation validation                                                */
/* ------------------------------------------------------------------ */

/** Operations that mutate history, the remote, or discard user work. */
export const ELEVATED_GIT_OPERATIONS: ReadonlySet<GitOperationType> = new Set<GitOperationType>([
  'push',
  'discard',
  'branch_delete',
]);

export function isElevatedOperation(op: GitOperationType): boolean {
  return ELEVATED_GIT_OPERATIONS.has(op);
}

/** Operations that talk to the remote and therefore need a credential. */
export const NETWORK_GIT_OPERATIONS: ReadonlySet<GitOperationType> = new Set<GitOperationType>([
  'clone',
  'push',
  'pull',
  'fetch',
]);

export function requiresCredential(op: GitOperationType): boolean {
  return NETWORK_GIT_OPERATIONS.has(op);
}

/**
 * Validate and normalize an untrusted operation payload.
 * Returns a value safe to persist and to hand to the agent.
 */
export function validateGitOperation(input: unknown): GitOperation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new InvalidGitOperationError('Git operation must be an object.');
  }

  const raw = input as Record<string, unknown>;
  const op = raw.op;

  switch (op) {
    case 'clone':
      return {
        op: 'clone',
        repoUrl: validateRepoUrl(raw.repoUrl),
        branch: raw.branch === undefined || raw.branch === null ? null : validateBranchName(raw.branch),
      };

    case 'status':
      return { op: 'status' };

    case 'branch_list':
      return { op: 'branch_list' };

    case 'branch_create':
      return {
        op: 'branch_create',
        branch: validateBranchName(raw.branch),
        from: raw.from === undefined || raw.from === null ? null : validateBranchName(raw.from),
      };

    case 'branch_switch':
      return { op: 'branch_switch', branch: validateBranchName(raw.branch) };

    case 'branch_delete':
      return {
        op: 'branch_delete',
        branch: validateBranchName(raw.branch),
        force: raw.force === true,
      };

    case 'stage':
      return { op: 'stage', paths: validatePaths(raw.paths) };

    case 'unstage':
      return { op: 'unstage', paths: validatePaths(raw.paths) };

    case 'discard':
      return { op: 'discard', paths: validatePaths(raw.paths) };

    case 'commit':
      return { op: 'commit', message: validateCommitMessage(raw.message) };

    case 'push':
      return {
        op: 'push',
        branch: raw.branch === undefined || raw.branch === null ? null : validateBranchName(raw.branch),
        setUpstream: raw.setUpstream === true,
      };

    case 'pull':
      return {
        op: 'pull',
        branch: raw.branch === undefined || raw.branch === null ? null : validateBranchName(raw.branch),
      };

    case 'fetch':
      return { op: 'fetch' };

    case 'diff':
      return {
        op: 'diff',
        path:
          raw.path === undefined || raw.path === null
            ? null
            : validatePaths([raw.path])[0],
        staged: raw.staged === true,
      };

    case 'log':
      return {
        op: 'log',
        limit:
          typeof raw.limit === 'number' && Number.isFinite(raw.limit)
            ? Math.min(Math.max(Math.floor(raw.limit), 1), 100)
            : 20,
      };

    default:
      throw new InvalidGitOperationError(`Unsupported Git operation "${String(op)}".`);
  }
}

/* ------------------------------------------------------------------ */
/* argv construction                                                   */
/* ------------------------------------------------------------------ */

/**
 * Turn a validated operation into an argv array.
 *
 * Shared by the server (for display and audit) and the agent (for execution),
 * so what the user is shown is exactly what runs. `--` separates options from
 * pathspecs wherever paths are involved, so a file named `-rf` is still just a
 * file. No value is ever interpolated into a string.
 */
export function buildGitArgv(operation: GitOperation): string[] {
  switch (operation.op) {
    case 'clone':
      return [
        'clone',
        ...(operation.branch ? ['--branch', operation.branch] : []),
        '--',
        operation.repoUrl,
        '.',
      ];

    case 'status':
      // porcelain=v1 -z gives NUL-delimited, rename-aware, locale-independent
      // output that is safe to parse even when filenames contain spaces.
      return ['status', '--porcelain=v1', '-z', '--branch', '--untracked-files=all'];

    case 'branch_list':
      return [
        'branch',
        '--list',
        '--all',
        '--format=%(refname:short)%09%(HEAD)%09%(upstream:short)%09%(upstream:track)',
      ];

    case 'branch_create':
      return operation.from
        ? ['checkout', '-b', operation.branch, operation.from]
        : ['checkout', '-b', operation.branch];

    case 'branch_switch':
      return ['checkout', operation.branch];

    case 'branch_delete':
      return ['branch', operation.force ? '-D' : '-d', operation.branch];

    case 'stage':
      return ['add', '--', ...operation.paths];

    case 'unstage':
      return ['restore', '--staged', '--', ...operation.paths];

    case 'discard':
      return ['checkout', '--', ...operation.paths];

    case 'commit':
      // The message is its own argv element. Nothing is quoted or escaped
      // because nothing is ever parsed as a string.
      return ['commit', '-m', operation.message];

    case 'push':
      return [
        'push',
        ...(operation.setUpstream ? ['--set-upstream'] : []),
        'origin',
        ...(operation.branch ? [operation.branch] : ['HEAD']),
      ];

    case 'pull':
      return ['pull', '--ff-only', 'origin', ...(operation.branch ? [operation.branch] : [])];

    case 'fetch':
      return ['fetch', '--prune', 'origin'];

    case 'diff':
      return [
        'diff',
        ...(operation.staged ? ['--staged'] : []),
        '--no-color',
        ...(operation.path ? ['--', operation.path] : []),
      ];

    case 'log':
      return [
        'log',
        `--max-count=${operation.limit ?? 20}`,
        '--pretty=format:%H%x09%an%x09%ar%x09%s',
        '--no-color',
      ];

    default: {
      const exhaustive: never = operation;
      throw new InvalidGitOperationError(`Unsupported operation: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/** Human-readable label for the terminal and audit log. */
export function describeGitOperation(operation: GitOperation): string {
  switch (operation.op) {
    case 'clone':
      return `git clone ${operation.repoUrl}${operation.branch ? ` (${operation.branch})` : ''}`;
    case 'commit':
      return `git commit -m "${operation.message.split('\n')[0].slice(0, 60)}"`;
    case 'branch_create':
      return `git checkout -b ${operation.branch}`;
    case 'branch_switch':
      return `git checkout ${operation.branch}`;
    case 'branch_delete':
      return `git branch ${operation.force ? '-D' : '-d'} ${operation.branch}`;
    case 'stage':
      return `git add ${operation.paths.length} file(s)`;
    case 'unstage':
      return `git restore --staged ${operation.paths.length} file(s)`;
    case 'discard':
      return `git checkout -- ${operation.paths.length} file(s)`;
    case 'push':
      return `git push origin ${operation.branch ?? 'HEAD'}`;
    case 'pull':
      return `git pull --ff-only origin${operation.branch ? ` ${operation.branch}` : ''}`;
    case 'fetch':
      return 'git fetch --prune origin';
    case 'diff':
      return `git diff${operation.staged ? ' --staged' : ''}${operation.path ? ` -- ${operation.path}` : ''}`;
    case 'log':
      return 'git log';
    case 'status':
      return 'git status';
    default:
      return 'git';
  }
}

/** Warning shown before a destructive operation is queued. */
export function elevatedWarning(operation: GitOperation): string | null {
  switch (operation.op) {
    case 'discard':
      return `This permanently discards local changes to ${operation.paths.length} file(s). They cannot be recovered.`;
    case 'branch_delete':
      return operation.force
        ? `Force-deleting "${operation.branch}" discards commits that are not merged anywhere else.`
        : `Delete the branch "${operation.branch}"?`;
    case 'push':
      return `This publishes your commits to origin/${operation.branch ?? 'HEAD'} on GitHub.`;
    default:
      return null;
  }
}
