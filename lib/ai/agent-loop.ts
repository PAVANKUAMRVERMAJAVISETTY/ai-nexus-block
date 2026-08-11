/**
 * Nexus AI Assistant — agent loop.
 *
 * A resumable state machine, not an in-request `while` loop. Commands execute
 * asynchronously on the user's machine, so the loop advances as far as it can,
 * parks on whatever it is waiting for, and is resumed by a later request.
 *
 *   plan ──► tool call ──► observation ──► plan ──► … ──► finish
 *              │
 *              ├─ needs a command  → park: awaiting_command
 *              ├─ needs approval   → park: awaiting_approval
 *              └─ needs the user   → park: awaiting_input
 *
 * The model is injected rather than imported, which lets the tests drive the
 * whole loop with scripted responses and assert real behaviour — including
 * that the loop cannot report success without a genuine verification result.
 */

import {
  describeToolCall,
  getTool,
  parseAssistantTurn,
  type ToolCall,
  type ToolName,
} from './tools';

/* ------------------------------------------------------------------ */
/* Limits                                                              */
/* ------------------------------------------------------------------ */

export const AGENT_LIMITS = {
  /** Hard ceiling on model turns for one task. */
  maxIterations: 24,
  /** Hard ceiling on tool executions for one task. */
  maxToolCalls: 40,
  /** How many times the loop may automatically fix a failing verification. */
  maxRepairAttempts: 4,
  /** How long a single queued command may take before the loop gives up. */
  commandTimeoutMs: 10 * 60 * 1000,
  /** Consecutive malformed model turns before the loop aborts. */
  maxConsecutiveParseErrors: 3,
} as const;

/* ------------------------------------------------------------------ */
/* Transcript                                                          */
/* ------------------------------------------------------------------ */

export type TranscriptEntry =
  | { type: 'user'; content: string; at: string }
  | { type: 'assistant'; content: string; at: string }
  | { type: 'tool_call'; tool: ToolName; label: string; args: Record<string, unknown>; reason?: string; at: string }
  | { type: 'observation'; tool: ToolName; ok: boolean; content: string; at: string }
  | { type: 'note'; content: string; at: string };

/**
 * `Omit` over a union collapses it to the shared keys, so a plain
 * `Omit<TranscriptEntry, 'at'>` loses every variant-specific field. This
 * distributes the Omit across each member instead.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type TranscriptDraft = DistributiveOmit<TranscriptEntry, 'at'>;

export type AgentStatus =
  | 'planning'
  | 'awaiting_command'
  | 'awaiting_approval'
  | 'awaiting_input'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentSessionState {
  goal: string;
  status: AgentStatus;
  transcript: TranscriptEntry[];
  iterations: number;
  toolCalls: number;
  repairAttempts: number;
  pendingRunId: string | null;
  pendingActionId: string | null;
  pendingQuestion: string | null;
  summary: string | null;
  success: boolean | null;
  errorMessage: string | null;
  cancelRequested: boolean;
}

export function createSessionState(goal: string): AgentSessionState {
  return {
    goal,
    status: 'planning',
    transcript: [{ type: 'user', content: goal, at: new Date().toISOString() }],
    iterations: 0,
    toolCalls: 0,
    repairAttempts: 0,
    pendingRunId: null,
    pendingActionId: null,
    pendingQuestion: null,
    summary: null,
    success: null,
    errorMessage: null,
    cancelRequested: false,
  };
}

/* ------------------------------------------------------------------ */
/* Ports                                                               */
/* ------------------------------------------------------------------ */

/** Result of executing one tool. */
export interface ToolResult {
  ok: boolean;
  /** Text fed back to the model as the observation. */
  content: string;
  /** Set when the tool queued asynchronous work the loop must wait for. */
  pendingRunId?: string;
  /** Set when the tool produced a proposal needing approval. */
  pendingActionId?: string;
  /** Set for `finish`. */
  finished?: { summary: string; success: boolean };
  /** Set for `ask_user`. */
  question?: string;
  /**
   * True when the tool actually produced a verification result (a command that
   * ran to completion). Used to police success claims.
   */
  verificationRan?: boolean;
  verificationPassed?: boolean;
}

export interface AgentPorts {
  /** Ask the model for its next decision. Returns raw text. */
  callModel: (params: { system: string; messages: string }) => Promise<string>;
  /** Execute a validated tool call. */
  executeTool: (call: ToolCall) => Promise<ToolResult>;
  /** Build the system prompt (project context is assembled by the caller). */
  buildSystemPrompt: () => Promise<string> | string;
  /** Poll a queued run. `null` while it is still running. */
  pollRun: (runId: string) => Promise<ToolResult | null>;
}

/* ------------------------------------------------------------------ */
/* Rendering the conversation for the model                            */
/* ------------------------------------------------------------------ */

/** Keep the transcript bounded so a long task cannot exceed the context window. */
const MAX_OBSERVATION_CHARS = 6000;
const MAX_RENDERED_ENTRIES = 40;

export function renderTranscript(state: AgentSessionState): string {
  const entries = state.transcript.slice(-MAX_RENDERED_ENTRIES);
  const lines: string[] = [];

  if (state.transcript.length > entries.length) {
    lines.push(
      `[${state.transcript.length - entries.length} earlier steps omitted for brevity]`
    );
  }

  for (const entry of entries) {
    switch (entry.type) {
      case 'user':
        lines.push(`USER: ${entry.content}`);
        break;
      case 'assistant':
        if (entry.content.trim()) lines.push(`YOU: ${entry.content}`);
        break;
      case 'tool_call':
        lines.push(`YOU CALLED: ${entry.tool} ${JSON.stringify(entry.args).slice(0, 500)}`);
        break;
      case 'observation': {
        const content =
          entry.content.length > MAX_OBSERVATION_CHARS
            ? `${entry.content.slice(0, MAX_OBSERVATION_CHARS)}\n…[truncated]`
            : entry.content;
        lines.push(`RESULT (${entry.ok ? 'ok' : 'error'}): ${content}`);
        break;
      }
      case 'note':
        lines.push(`SYSTEM: ${entry.content}`);
        break;
    }
  }

  return lines.join('\n\n');
}

function push(state: AgentSessionState, entry: TranscriptDraft): void {
  state.transcript.push({ ...entry, at: new Date().toISOString() } as TranscriptEntry);
}

/* ------------------------------------------------------------------ */
/* Advancing the loop                                                  */
/* ------------------------------------------------------------------ */

export interface AdvanceOptions {
  /** Stop after this many model turns in one request, to bound latency. */
  maxStepsThisCall?: number;
}

/**
 * Advance the session as far as possible, then return.
 *
 * The caller persists the returned state. Every exit is either terminal
 * (completed/failed/cancelled) or a park the caller can resume from.
 */
export async function advanceSession(
  state: AgentSessionState,
  ports: AgentPorts,
  options: AdvanceOptions = {}
): Promise<AgentSessionState> {
  const maxSteps = options.maxStepsThisCall ?? 6;
  let steps = 0;
  let consecutiveParseErrors = 0;

  // Cancellation is checked before anything else and at every step boundary.
  if (state.cancelRequested) return cancel(state);

  // Resume a parked command before asking the model anything.
  if (state.status === 'awaiting_command' && state.pendingRunId) {
    const result = await ports.pollRun(state.pendingRunId);
    if (!result) return state; // still running — caller polls again

    state.pendingRunId = null;
    recordObservation(state, lastToolName(state), result);
    state.status = 'planning';
  }

  // A parked approval resumes only once the caller has resolved the action.
  if (state.status === 'awaiting_approval' || state.status === 'awaiting_input') {
    return state;
  }

  while (steps < maxSteps) {
    if (state.cancelRequested) return cancel(state);

    if (state.iterations >= AGENT_LIMITS.maxIterations) {
      return stop(
        state,
        'failed',
        `Stopped after ${AGENT_LIMITS.maxIterations} steps without finishing. ` +
          'The task may be too large for one run — try narrowing it.'
      );
    }
    if (state.toolCalls >= AGENT_LIMITS.maxToolCalls) {
      return stop(
        state,
        'failed',
        `Stopped after ${AGENT_LIMITS.maxToolCalls} tool calls without finishing.`
      );
    }
    if (state.repairAttempts >= AGENT_LIMITS.maxRepairAttempts) {
      return stop(
        state,
        'failed',
        `Stopped after ${AGENT_LIMITS.maxRepairAttempts} attempts to fix the same failure. ` +
          'The remaining problem needs a human decision.'
      );
    }

    state.iterations += 1;
    steps += 1;

    const system = await ports.buildSystemPrompt();
    const raw = await ports.callModel({ system, messages: renderTranscript(state) });
    const turn = parseAssistantTurn(raw);

    if (turn.message) push(state, { type: 'assistant', content: turn.message });

    // Malformed tool block: feed the error back so the model can correct it.
    if (turn.parseError) {
      consecutiveParseErrors += 1;
      if (consecutiveParseErrors >= AGENT_LIMITS.maxConsecutiveParseErrors) {
        return stop(
          state,
          'failed',
          'The assistant repeatedly produced an invalid tool call and could not recover.'
        );
      }
      push(state, { type: 'note', content: `Invalid tool call: ${turn.parseError}` });
      continue;
    }

    // No tool call at all: the model answered in prose and is done.
    if (!turn.toolCall) {
      return stop(
        state,
        'completed',
        undefined,
        turn.message || 'Done.',
        // No verification ran, so this is explicitly not a verified success.
        null
      );
    }

    consecutiveParseErrors = 0;
    const call = turn.toolCall;

    push(state, {
      type: 'tool_call',
      tool: call.tool,
      label: describeToolCall(call),
      args: call.args,
      reason: call.reason,
    });
    state.toolCalls += 1;

    const result = await ports.executeTool(call);

    // ---- terminal states -------------------------------------------------

    if (result.finished) {
      // A success claim is only honoured if a verification actually ran and
      // passed during this session. Otherwise it is downgraded and labelled.
      const verified = sessionHasPassingVerification(state);
      const claimed = result.finished.success;

      return stop(
        state,
        'completed',
        undefined,
        result.finished.summary,
        claimed && !verified ? null : claimed
      );
    }

    if (result.question) {
      state.status = 'awaiting_input';
      state.pendingQuestion = result.question;
      recordObservation(state, call.tool, result);
      return state;
    }

    if (result.pendingActionId) {
      state.status = 'awaiting_approval';
      state.pendingActionId = result.pendingActionId;
      recordObservation(state, call.tool, result);
      return state;
    }

    if (result.pendingRunId) {
      state.status = 'awaiting_command';
      state.pendingRunId = result.pendingRunId;
      recordObservation(state, call.tool, result);
      return state;
    }

    // ---- synchronous observation ----------------------------------------

    recordObservation(state, call.tool, result);
  }

  // Ran out of steps for this request; the caller resumes.
  state.status = 'planning';
  return state;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function recordObservation(state: AgentSessionState, tool: ToolName, result: ToolResult): void {
  push(state, { type: 'observation', tool, ok: result.ok, content: result.content });

  // Count a failed verification wherever it lands. Doing this only on the async
  // resume path let a synchronously-resolved failure bypass the repair ceiling,
  // so the loop would spin up to the much higher iteration ceiling instead.
  if (result.verificationRan && result.verificationPassed === false) {
    state.repairAttempts += 1;
  }
}

function lastToolName(state: AgentSessionState): ToolName {
  for (let i = state.transcript.length - 1; i >= 0; i -= 1) {
    const entry = state.transcript[i];
    if (entry.type === 'tool_call') return entry.tool;
  }
  return 'terminal_run';
}

/**
 * Did a real verification pass during this session?
 *
 * This is the guard behind "never claim tests passed unless they ran". It
 * inspects the transcript for an observation from a verification tool that
 * actually succeeded — a model asserting success in prose is not enough.
 */
export function sessionHasPassingVerification(state: AgentSessionState): boolean {
  const verificationTools: ToolName[] = ['test_run', 'build_run', 'typecheck_run', 'lint_run'];

  let passed = false;
  for (const entry of state.transcript) {
    if (entry.type !== 'observation') continue;
    if (!verificationTools.includes(entry.tool)) continue;
    // A later failure invalidates an earlier pass.
    passed = entry.ok;
  }
  return passed;
}

/** Verification tools that ran, with their outcome — used in the final report. */
export function verificationSummary(
  state: AgentSessionState
): { tool: ToolName; passed: boolean }[] {
  const verificationTools: ToolName[] = ['test_run', 'build_run', 'typecheck_run', 'lint_run'];
  const byTool = new Map<ToolName, boolean>();

  for (const entry of state.transcript) {
    if (entry.type === 'observation' && verificationTools.includes(entry.tool)) {
      byTool.set(entry.tool, entry.ok);
    }
  }

  return Array.from(byTool.entries()).map(([tool, passed]) => ({ tool, passed }));
}

function stop(
  state: AgentSessionState,
  status: AgentStatus,
  errorMessage?: string,
  summary?: string,
  success: boolean | null = null
): AgentSessionState {
  state.status = status;
  state.errorMessage = errorMessage ?? null;
  state.summary = summary ?? state.summary;
  state.success = success;
  state.pendingRunId = null;
  state.pendingActionId = null;

  if (errorMessage) push(state, { type: 'note', content: errorMessage });
  return state;
}

function cancel(state: AgentSessionState): AgentSessionState {
  state.status = 'cancelled';
  state.pendingRunId = null;
  state.pendingActionId = null;
  state.success = null;
  push(state, { type: 'note', content: 'Stopped by the user.' });
  return state;
}

/** Resume after the user approves or rejects a parked proposal. */
export function resumeAfterApproval(
  state: AgentSessionState,
  outcome: { approved: boolean; detail: string }
): AgentSessionState {
  state.pendingActionId = null;
  state.status = 'planning';

  push(state, {
    type: 'observation',
    tool: 'project_edit_file',
    ok: outcome.approved,
    content: outcome.approved
      ? `The user approved the change. ${outcome.detail}`
      : `The user REJECTED the change. ${outcome.detail} Do not retry the same edit — ask what they want instead.`,
  });

  return state;
}

/**
 * Continue a finished task with a follow-up instruction.
 *
 * The transcript is deliberately KEPT — that is what makes "Create
 * authentication" -> "Use Supabase" -> "Also add Google login" work as one
 * evolving task rather than three unrelated requests. The per-task budgets are
 * reset, because a follow-up is new work and should not inherit the exhausted
 * allowance of the previous one.
 */
export function continueSession(
  state: AgentSessionState,
  message: string
): AgentSessionState {
  state.status = 'planning';
  state.summary = null;
  state.success = null;
  state.errorMessage = null;
  state.cancelRequested = false;
  state.pendingQuestion = null;
  state.pendingRunId = null;
  state.pendingActionId = null;

  state.iterations = 0;
  state.toolCalls = 0;
  state.repairAttempts = 0;

  push(state, { type: 'user', content: message });
  return state;
}

/** Resume after the user answers a question. */
export function resumeAfterInput(state: AgentSessionState, answer: string): AgentSessionState {
  state.pendingQuestion = null;
  state.status = 'planning';
  push(state, { type: 'user', content: answer });
  return state;
}

/** Whether a tool needs the user before it can take effect. */
export function requiresUserConsent(tool: ToolName): boolean {
  const definition = getTool(tool);
  return (
    definition?.approval === 'requires_approval' ||
    definition?.approval === 'requires_confirmation'
  );
}
