/**
 * Typed browser client for the Nexus IDE API.
 *
 * Every call goes through `request()`, which normalizes error handling so the
 * UI always receives a real message instead of an opaque failure.
 */

import type {
  GitBranchInfo,
  GitDiffFile,
  GitHubRepository,
  GitOperationResult,
  GitStatusSummary,
} from '@/types/git';
import type {
  IdeAgentAction,
  IdeAgentDevice,
  IdeAgentStatus,
  IdeAssistantMode,
  IdeAssistantScope,
  IdeExplanationLevel,
  IdeFile,
  IdeFileSummary,
  IdeProblem,
  IdeProject,
  IdeProjectOverview,
  IdeRouteFact,
  IdeRun,
  IdeRunLog,
  IdeTreeNode,
} from '@/types/ide';

export class IdeApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'IdeApiError';
    this.status = status;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new IdeApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new IdeApiError(response.status, 'The server returned an unreadable response.');
    }
  }

  if (!response.ok) {
    const message =
      (payload as { error?: string })?.error ?? `Request failed with status ${response.status}.`;
    throw new IdeApiError(response.status, message);
  }

  return payload as T;
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

/** One step in an agent session, as rendered by the activity feed. */
export type AgentTranscriptEntry =
  | { type: 'user'; content: string; at: string }
  | { type: 'assistant'; content: string; at: string }
  | {
      type: 'tool_call';
      tool: string;
      label: string;
      args: Record<string, unknown>;
      reason?: string;
      at: string;
    }
  | { type: 'observation'; tool: string; ok: boolean; content: string; at: string }
  | { type: 'note'; content: string; at: string };

/** Everything the agent panel needs to render one session state. */
export interface AgentSessionResponse {
  session: {
    id: string;
    goal: string;
    status:
      | 'planning'
      | 'awaiting_command'
      | 'awaiting_approval'
      | 'awaiting_input'
      | 'completed'
      | 'failed'
      | 'cancelled';
    transcript: AgentTranscriptEntry[];
    iterations: number;
    tool_calls: number;
    pending_action_id: string | null;
    pending_question: string | null;
    summary: string | null;
    success: boolean | null;
    error_message: string | null;
  };
  verifications: { tool: string; passed: boolean }[];
  filesChanged: string[];
  report: string | null;
}

export interface TemplateSummary {
  id: string;
  label: string;
  description: string;
  category: string;
  framework: string;
  primaryLanguage: string;
  packageManager: string;
  learn: string[];
  fileCount: number;
}

export const ideClient = {
  listProjects: () =>
    request<{ projects: IdeProject[]; templates: TemplateSummary[] }>('/api/ide/projects'),

  createProject: (input: { name: string; description?: string; template: string }) =>
    request<{ project: IdeProject; fileCount: number }>('/api/ide/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getProject: (projectId: string) =>
    request<{
      project: IdeProject;
      stats: { fileCount: number; pendingActions: number };
      recentRuns: IdeRun[];
    }>(`/api/ide/projects/${projectId}`),

  updateProject: (projectId: string, updates: Partial<Pick<IdeProject, 'name' | 'description'>>) =>
    request<{ project: IdeProject }>(`/api/ide/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteProject: (projectId: string, confirmName: string) =>
    request<{ success: boolean }>(
      `/api/ide/projects/${projectId}?confirm=${encodeURIComponent(confirmName)}`,
      { method: 'DELETE' }
    ),

  /* ---------------------------------------------------------------- */
  /* Files                                                             */
  /* ---------------------------------------------------------------- */

  listFiles: (projectId: string) =>
    request<{ files: IdeFileSummary[]; tree: IdeTreeNode[] }>(
      `/api/ide/projects/${projectId}/files`
    ),

  readFile: (projectId: string, path: string) =>
    request<{ file: IdeFile }>(
      `/api/ide/projects/${projectId}/files?path=${encodeURIComponent(path)}`
    ),

  createFile: (projectId: string, input: { path: string; content?: string; isDirectory?: boolean }) =>
    request<{ file: IdeFile }>(`/api/ide/projects/${projectId}/files`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  saveFile: (projectId: string, path: string, content: string) =>
    request<{ file: IdeFile }>(`/api/ide/projects/${projectId}/files`, {
      method: 'PUT',
      body: JSON.stringify({ path, content }),
    }),

  renameFile: (projectId: string, path: string, newPath: string) =>
    request<{ success: boolean; affected: number }>(`/api/ide/projects/${projectId}/files`, {
      method: 'PATCH',
      body: JSON.stringify({ op: 'rename', path, newPath }),
    }),

  duplicateFile: (projectId: string, path: string, newPath: string) =>
    request<{ success: boolean; affected: number }>(`/api/ide/projects/${projectId}/files`, {
      method: 'PATCH',
      body: JSON.stringify({ op: 'duplicate', path, newPath }),
    }),

  deleteFile: (projectId: string, path: string) =>
    request<{ success: boolean; removedPaths: string[] }>(
      `/api/ide/projects/${projectId}/files?path=${encodeURIComponent(path)}`,
      { method: 'DELETE' }
    ),

  /* ---------------------------------------------------------------- */
  /* Index                                                             */
  /* ---------------------------------------------------------------- */

  getIndex: (projectId: string, refresh = false) =>
    request<{
      cached: boolean;
      generatedAt: string | null;
      fileCount: number;
      overview: IdeProjectOverview | null;
      routes: IdeRouteFact[];
      tree: string[];
    }>(`/api/ide/projects/${projectId}/index${refresh ? '?refresh=true' : ''}`),

  /* ---------------------------------------------------------------- */
  /* Runs                                                              */
  /* ---------------------------------------------------------------- */

  listRuns: (projectId: string, limit = 25) =>
    request<{ runs: IdeRun[] }>(`/api/ide/runs?projectId=${projectId}&limit=${limit}`),

  queueRun: (input: {
    projectId: string;
    command: string;
    confirmElevated?: boolean;
    triggeredBy?: 'user' | 'ai';
    actionId?: string;
  }) =>
    request<{ run: IdeRun; agentOnline: boolean; message?: string }>('/api/ide/runs', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getRun: (runId: string, sinceSeq = -1) =>
    request<{ run: IdeRun; logs: IdeRunLog[]; problems: IdeProblem[] }>(
      `/api/ide/runs/${runId}?sinceSeq=${sinceSeq}`
    ),

  cancelRun: (runId: string) =>
    request<{ run: IdeRun; cancelledImmediately: boolean; message?: string }>(
      `/api/ide/runs/${runId}`,
      { method: 'PATCH', body: JSON.stringify({ cancel: true }) }
    ),

  /* ---------------------------------------------------------------- */
  /* Local agent                                                       */
  /* ---------------------------------------------------------------- */

  getAgentStatus: () =>
    request<{ devices: IdeAgentDevice[]; status: IdeAgentStatus }>('/api/ide/agent/devices'),

  pairAgent: (name: string) =>
    request<{ device: IdeAgentDevice; token: string; warning: string }>('/api/ide/agent/devices', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  revokeAgent: (deviceId: string) =>
    request<{ success: boolean }>(`/api/ide/agent/devices?id=${deviceId}`, { method: 'DELETE' }),

  /* ---------------------------------------------------------------- */
  /* Assistant                                                         */
  /* ---------------------------------------------------------------- */

  ask: (input: {
    projectId: string;
    message: string;
    mode: IdeAssistantMode;
    level: IdeExplanationLevel;
    conversationId?: string | null;
    scope?: IdeAssistantScope;
  }) =>
    request<{
      content: string;
      conversationId: string | null;
      action: IdeAgentAction | null;
      warnings: string[];
      contextFilesUsed: string[];
      debugProvider?: string;
      debugModel?: string;
    }>('/api/ide/assistant', { method: 'POST', body: JSON.stringify(input) }),

  /* ---------------------------------------------------------------- */
  /* Change proposals                                                  */
  /* ---------------------------------------------------------------- */

  listActions: (projectId: string, status?: string) =>
    request<{ actions: IdeAgentAction[] }>(
      `/api/ide/actions?projectId=${projectId}${status ? `&status=${status}` : ''}`
    ),

  /* ---------------------------------------------------------------- */
  /* GitHub                                                            */
  /* ---------------------------------------------------------------- */

  getGitHubStatus: () =>
    request<{
      configured: boolean;
      connected: boolean;
      connection: {
        login: string;
        avatarUrl: string | null;
        scopes: string[];
        status: string;
        connectedAt: string;
      } | null;
    }>('/api/ide/github'),

  disconnectGitHub: () =>
    request<{ success: boolean; revokedAtGitHub: boolean; message: string }>('/api/ide/github', {
      method: 'DELETE',
    }),

  listGitHubRepos: (query = '') =>
    request<{ repositories: GitHubRepository[]; total: number; filtered: number }>(
      `/api/ide/github/repos${query ? `?q=${encodeURIComponent(query)}` : ''}`
    ),

  importRepository: (input: { fullName: string; branch?: string; projectName?: string }) =>
    request<{
      project: IdeProject;
      repository: { fullName: string; defaultBranch: string; private: boolean; canPush: boolean };
      branch: string;
      cloneRunId: string | null;
      cloneQueued: boolean;
      message: string;
    }>('/api/ide/github/import', { method: 'POST', body: JSON.stringify(input) }),

  /* ---------------------------------------------------------------- */
  /* Git operations                                                    */
  /* ---------------------------------------------------------------- */

  runGitOperation: (input: {
    projectId: string;
    operation: Record<string, unknown>;
    confirmElevated?: boolean;
    triggeredBy?: 'user' | 'ai';
  }) =>
    request<{ run: IdeRun; agentOnline: boolean; message?: string }>('/api/ide/git', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** Poll a git run until it finishes, then return its parsed result. */
  getGitRun: (runId: string) =>
    request<{ run: IdeRun & { result?: GitOperationResult }; logs: IdeRunLog[] }>(
      `/api/ide/runs/${runId}`
    ),

  getAction: (actionId: string) =>
    request<{ action: IdeAgentAction }>(`/api/ide/actions/${actionId}`),

  /* ---------------------------------------------------------------- */
  /* Agent sessions (the coding agent loop)                            */
  /* ---------------------------------------------------------------- */

  startAgentSession: (input: {
    projectId: string;
    goal: string;
    activeFilePath?: string | null;
    selection?: string | null;
  }) =>
    request<AgentSessionResponse>('/api/ide/agent-session', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** Advance the loop one request's worth. The UI calls this on a timer. */
  advanceAgentSession: (
    sessionId: string,
    context: { activeFilePath?: string | null; selection?: string | null } = {}
  ) =>
    request<AgentSessionResponse>(`/api/ide/agent-session/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify(context),
    }),

  /**
   * Continue a finished task with a follow-up instruction, keeping the
   * previous transcript as context.
   */
  continueAgentSession: (
    sessionId: string,
    message: string,
    context: { activeFilePath?: string | null; selection?: string | null } = {}
  ) =>
    request<AgentSessionResponse>(`/api/ide/agent-session/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ message, ...context }),
    }),

  cancelAgentSession: (sessionId: string) =>
    request<AgentSessionResponse>(`/api/ide/agent-session/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ cancel: true }),
    }),

  answerAgentSession: (sessionId: string, answer: string) =>
    request<AgentSessionResponse>(`/api/ide/agent-session/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ answer }),
    }),

  /** Resume the loop after the user approved or rejected a proposed change. */
  resolveAgentApproval: (sessionId: string) =>
    request<AgentSessionResponse>(`/api/ide/agent-session/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ approvalResolved: true }),
    }),

  decideAction: (actionId: string, decision: 'approve' | 'reject', confirmHighRisk = false) =>
    request<{
      action: IdeAgentAction;
      applied: boolean;
      appliedOperations?: string[];
      failedOperations?: string[];
      validationCommand?: string | null;
    }>(`/api/ide/actions/${actionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, confirmHighRisk }),
    }),
};
