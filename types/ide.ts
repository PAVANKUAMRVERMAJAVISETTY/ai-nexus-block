import type { UUID, ISODateString } from './common';

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export type IdeProjectStatus = 'active' | 'archived';
export type IdePackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'pip' | 'maven' | 'gradle' | 'none';

export interface IdeProject {
  id: UUID;
  user_id: UUID;
  name: string;
  slug: string | null;
  description: string | null;
  template: string;
  framework: string;
  primary_language: string;
  package_manager: IdePackageManager;
  status: IdeProjectStatus;
  git_repository_url: string | null;
  /** "owner/repo" when this project was imported from GitHub. */
  github_repo_full_name: string | null;
  github_default_branch: string | null;
  github_connection_id: UUID | null;
  /** Set once an agent has actually cloned the repository to local disk. */
  git_cloned_at: ISODateString | null;
  /** Suggested directory name for the local agent workspace. Never an absolute path. */
  workspace_hint: string | null;
  last_opened_at: ISODateString | null;
  settings: Record<string, unknown>;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ------------------------------------------------------------------ */
/* Virtual filesystem                                                  */
/* ------------------------------------------------------------------ */

export type IdeFileOrigin = 'user' | 'template' | 'ai' | 'import';

export interface IdeFile {
  id: UUID;
  project_id: UUID;
  user_id: UUID;
  /** Normalized, project-relative POSIX path with no leading slash. */
  file_path: string;
  filename: string;
  parent_path: string;
  content: string;
  language: string;
  size: number;
  is_directory: boolean;
  is_binary: boolean;
  content_hash: string | null;
  origin: IdeFileOrigin;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** File metadata without `content` — what the explorer loads. */
export type IdeFileSummary = Omit<IdeFile, 'content'>;

export interface IdeTreeNode {
  path: string;
  name: string;
  isDirectory: boolean;
  language: string;
  size: number;
  fileId: UUID | null;
  children: IdeTreeNode[];
}

/* ------------------------------------------------------------------ */
/* Local development agent                                             */
/* ------------------------------------------------------------------ */

export type IdeAgentDeviceStatus = 'pending' | 'active' | 'revoked';

export interface IdeAgentDevice {
  id: UUID;
  user_id: UUID;
  name: string;
  token_prefix: string;
  status: IdeAgentDeviceStatus;
  platform: string | null;
  agent_version: string | null;
  workspace_root: string | null;
  last_seen_at: ISODateString | null;
  revoked_at: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** What the UI needs to decide between "connected" and "no agent". */
export interface IdeAgentStatus {
  connected: boolean;
  device: IdeAgentDevice | null;
  /** Seconds since the agent last polled, or null when never seen. */
  lastSeenSecondsAgo: number | null;
  /** False when the server lacks SUPABASE_SERVICE_ROLE_KEY. */
  serverConfigured: boolean;
}

/* ------------------------------------------------------------------ */
/* Runs                                                                */
/* ------------------------------------------------------------------ */

export type IdeRunStatus =
  | 'queued'
  | 'claimed'
  | 'running'
  | 'success'
  | 'error'
  | 'cancelled'
  | 'timeout';

export type IdeRunKind =
  | 'install'
  | 'dev'
  | 'build'
  | 'test'
  | 'typecheck'
  | 'lint'
  | 'git'
  | 'custom';

export interface IdeRun {
  id: UUID;
  project_id: UUID;
  user_id: UUID;
  command: string;
  kind: IdeRunKind;
  status: IdeRunStatus;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  duration_ms: number | null;
  device_id: UUID | null;
  claimed_at: ISODateString | null;
  started_at: ISODateString | null;
  finished_at: ISODateString | null;
  cancel_requested: boolean;
  triggered_by: 'user' | 'ai' | 'system';
  action_id: UUID | null;
  created_at: ISODateString;
}

export interface IdeRunLog {
  id: UUID;
  run_id: UUID;
  user_id: UUID;
  stream: 'stdout' | 'stderr' | 'system';
  seq: number;
  chunk: string;
  created_at: ISODateString;
}

/* ------------------------------------------------------------------ */
/* Problems                                                            */
/* ------------------------------------------------------------------ */

export type IdeProblemSeverity = 'error' | 'warning' | 'info';
export type IdeProblemSource = 'typescript' | 'eslint' | 'build' | 'test' | 'runtime' | 'unknown';

export interface IdeProblem {
  id: UUID;
  project_id: UUID;
  user_id: UUID;
  run_id: UUID | null;
  source: IdeProblemSource;
  severity: IdeProblemSeverity;
  file_path: string | null;
  line: number | null;
  column: number | null;
  code: string | null;
  message: string;
  created_at: ISODateString;
}

/** A parsed diagnostic before it is persisted. */
export type IdeParsedProblem = Omit<
  IdeProblem,
  'id' | 'project_id' | 'user_id' | 'run_id' | 'created_at'
>;

/* ------------------------------------------------------------------ */
/* Agent actions (AI change governance)                                */
/* ------------------------------------------------------------------ */

export type IdeActionStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'failed' | 'reverted';
export type IdeActionRisk = 'low' | 'medium' | 'high';

export type IdeFileOperationType = 'create' | 'update' | 'delete' | 'rename';

export interface IdeFileOperation {
  type: IdeFileOperationType;
  path: string;
  /** Present for create/update. */
  content?: string;
  /** Present for rename. */
  newPath?: string;
  /** Server-populated: the content that exists today, for the diff view. */
  previousContent?: string | null;
  language?: string;
}

export interface IdeProposedChange {
  operations: IdeFileOperation[];
  /** Command the assistant suggests running to validate the change. */
  validationCommand?: string | null;
  notes?: string | null;
}

export interface IdeAgentAction {
  id: UUID;
  project_id: UUID;
  requested_by: UUID;
  conversation_id: UUID | null;
  action_type: string;
  title: string;
  summary: string | null;
  risk: IdeActionRisk;
  proposed_change: IdeProposedChange;
  files_affected: string[];
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  command_executed: string | null;
  validation_run_id: UUID | null;
  provider_used: string | null;
  status: IdeActionStatus;
  result_log: string | null;
  error_message: string | null;
  reviewed_at: ISODateString | null;
  applied_at: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ------------------------------------------------------------------ */
/* Project index (Phase 6)                                             */
/* ------------------------------------------------------------------ */

export type IdeIndexKind = 'overview' | 'tree' | 'modules' | 'routes' | 'dependencies';

export interface IdeProjectIndexRow {
  id: UUID;
  project_id: UUID;
  user_id: UUID;
  kind: IdeIndexKind;
  payload: Record<string, unknown>;
  file_count: number;
  is_stale: boolean;
  generated_at: ISODateString;
}

export interface IdeModuleFact {
  path: string;
  language: string;
  imports: string[];
  exports: string[];
  loc: number;
}

export interface IdeRouteFact {
  route: string;
  kind: 'page' | 'api' | 'layout' | 'middleware';
  path: string;
}

export interface IdeProjectOverview {
  name: string;
  framework: string;
  primaryLanguage: string;
  packageManager: string;
  fileCount: number;
  directoryCount: number;
  totalBytes: number;
  languages: Record<string, number>;
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  entryPoints: string[];
  hasTests: boolean;
  hasReadme: boolean;
  supabaseDetected: boolean;
  envVarsReferenced: string[];
}

/* ------------------------------------------------------------------ */
/* Connections                                                         */
/* ------------------------------------------------------------------ */

export type IdeConnectionProvider = 'github' | 'supabase' | 'vercel' | 'netlify';
export type IdeConnectionStatus = 'disconnected' | 'pending' | 'connected' | 'error';

export interface IdeProjectConnection {
  id: UUID;
  project_id: UUID;
  user_id: UUID;
  provider: IdeConnectionProvider;
  status: IdeConnectionStatus;
  external_id: string | null;
  display_name: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  last_synced_at: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ------------------------------------------------------------------ */
/* Assistant                                                           */
/* ------------------------------------------------------------------ */

export type IdeAssistantMode =
  | 'explain'
  | 'debug'
  | 'fix'
  | 'refactor'
  | 'create'
  | 'review'
  | 'test'
  | 'architect'
  | 'document'
  | 'learn';

export type IdeExplanationLevel = 'beginner' | 'intermediate' | 'advanced';

export interface IdeAssistantScope {
  /** Path of the file currently focused in the editor. */
  activeFilePath?: string | null;
  /** Code the user highlighted in Monaco. */
  selection?: string | null;
  selectionStartLine?: number | null;
  selectionEndLine?: number | null;
  /** A failed run the user asked the assistant to explain. */
  runId?: string | null;
  /** A specific diagnostic the user clicked "Explain" on. */
  problemId?: string | null;
}

export interface IdeAssistantRequest {
  projectId: UUID;
  message: string;
  mode: IdeAssistantMode;
  level: IdeExplanationLevel;
  conversationId?: UUID | null;
  scope?: IdeAssistantScope;
  /** When true the assistant may return a change proposal. */
  allowProposals?: boolean;
}

export interface IdeAssistantResponse {
  content: string;
  conversationId: UUID | null;
  action: IdeAgentAction | null;
  /** Only surfaced to super_admin debug views. */
  debugProvider?: string;
  tokensUsed?: number;
}
