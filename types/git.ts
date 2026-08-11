import type { ISODateString, UUID } from './common';

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export type GitFileStatus =
  | 'unmodified'
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'type_changed'
  | 'untracked'
  | 'conflicted';

export interface GitFileChange {
  path: string;
  /** Source path for a rename or copy. */
  originalPath: string | null;
  indexStatus: GitFileStatus;
  worktreeStatus: GitFileStatus;
  conflicted: boolean;
  staged: boolean;
  unstaged: boolean;
  untracked: boolean;
}

export interface GitStatusSummary {
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  files: GitFileChange[];
  hasConflicts: boolean;
  isClean: boolean;
  detached: boolean;
}

/* ------------------------------------------------------------------ */
/* Branches and commits                                                */
/* ------------------------------------------------------------------ */

export interface GitBranchInfo {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
  /** Upstream branch no longer exists on the remote. */
  isGone: boolean;
}

export interface GitCommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  relativeDate: string;
  subject: string;
}

/* ------------------------------------------------------------------ */
/* Diffs                                                               */
/* ------------------------------------------------------------------ */

export interface GitDiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface GitDiffHunk {
  header: string;
  heading: string | null;
  lines: GitDiffLine[];
}

export interface GitDiffFile {
  path: string;
  oldPath: string | null;
  hunks: GitDiffHunk[];
  additions: number;
  deletions: number;
  isBinary: boolean;
}

/* ------------------------------------------------------------------ */
/* GitHub connection                                                   */
/* ------------------------------------------------------------------ */

export type GitProvider = 'github';

export interface GitHubConnection {
  id: UUID;
  user_id: UUID;
  provider: GitProvider;
  /** GitHub login (username). Safe to display. */
  external_login: string;
  external_id: string | null;
  avatar_url: string | null;
  scopes: string[];
  status: 'connected' | 'expired' | 'revoked';
  connected_at: ISODateString;
  last_used_at: ISODateString | null;
  /**
   * NOTE: the encrypted token columns are never selected into this type.
   * Nothing that reaches a browser may contain credential material.
   */
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  cloneUrl: string;
  updatedAt: string | null;
  language: string | null;
  stars: number;
  /** Whether the connection can push to this repository. */
  canPush: boolean;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatarUrl: string | null;
  name: string | null;
}

/* ------------------------------------------------------------------ */
/* Operation results                                                   */
/* ------------------------------------------------------------------ */

/** Parsed result the agent reports back for a Git operation. */
export interface GitOperationResult {
  status?: GitStatusSummary;
  branches?: GitBranchInfo[];
  commits?: GitCommitInfo[];
  diff?: GitDiffFile[];
  /** Human-readable interpretation of a failure, alongside raw stderr. */
  errorExplanation?: string | null;
}
