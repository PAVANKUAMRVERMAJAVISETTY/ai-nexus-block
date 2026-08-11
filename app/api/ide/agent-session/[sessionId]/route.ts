import { NextResponse } from 'next/server';
import {
  ApiError,
  enforceRateLimit,
  isUuid,
  readJsonBody,
  requireProject,
  requireUser,
  toErrorResponse,
} from '@/lib/ide/api';
import {
  advanceAndPersist,
  loadSession,
  persistState,
  rowToState,
} from '@/lib/ide/agent-session-service';
import {
  continueSession,
  resumeAfterApproval,
  resumeAfterInput,
  verificationSummary,
} from '@/lib/ai/agent-loop';
import { buildFinalReport } from '@/lib/ai/agent-prompt';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface RouteParams {
  params: { sessionId: string };
}

/** Shape returned to the UI for any session state. */
async function serialize(
  ctx: Awaited<ReturnType<typeof requireUser>>,
  row: Awaited<ReturnType<typeof loadSession>>
) {
  const state = rowToState(row);
  const verifications = verificationSummary(state);

  const { data: actions } = await ctx.supabase
    .from('ide_agent_actions')
    .select('files_affected')
    .eq('session_id', row.id)
    .eq('status', 'applied');

  const filesChanged = Array.from(
    new Set(
      ((actions ?? []) as { files_affected: string[] }[]).flatMap((a) => a.files_affected ?? [])
    )
  );

  const terminal = ['completed', 'failed', 'cancelled'].includes(row.status);

  return {
    session: row,
    verifications,
    filesChanged,
    // The report is built from the loop's own record, so the verification line
    // is accurate even when the model's prose oversells the result.
    report: terminal
      ? buildFinalReport({
          summary: row.summary,
          success: row.success,
          filesChanged,
          verifications,
          cancelled: row.status === 'cancelled',
          error: row.error_message,
        })
      : null,
  };
}

/**
 * GET /api/ide/agent-session/:id — poll without advancing.
 * Used by the UI for a cheap status refresh.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    if (!isUuid(params.sessionId)) throw new ApiError(400, 'Invalid session id.');

    const row = await loadSession(ctx, params.sessionId);
    return NextResponse.json(await serialize(ctx, row));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/ide/agent-session/:id — advance the loop.
 *
 * Each call moves the session forward by a bounded number of steps and then
 * returns, because commands run asynchronously on the user's own machine and a
 * request cannot wait for them.
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    enforceRateLimit(ctx.userId, 'ai');

    if (!isUuid(params.sessionId)) throw new ApiError(400, 'Invalid session id.');

    const row = await loadSession(ctx, params.sessionId);
    const project = await requireProject(ctx, row.project_id);

    let body: Record<string, unknown> = {};
    try {
      body = await readJsonBody(request);
    } catch {
      // Advancing needs no body.
    }

    const result = await advanceAndPersist(ctx, row, project, {
      activeFilePath: typeof body.activeFilePath === 'string' ? body.activeFilePath : null,
      selection: typeof body.selection === 'string' ? body.selection.slice(0, 12000) : null,
    });

    return NextResponse.json(await serialize(ctx, result.row));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * PATCH /api/ide/agent-session/:id
 *   { cancel: true }        — stop the task
 *   { answer: string }      — reply to an ask_user question
 *   { approvalResolved }    — resume after the user approved/rejected a diff
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    if (!isUuid(params.sessionId)) throw new ApiError(400, 'Invalid session id.');

    const body = await readJsonBody(request);
    const row = await loadSession(ctx, params.sessionId);
    const state = rowToState(row);
    const isTerminal = ['completed', 'failed', 'cancelled'].includes(state.status);

    // ---- follow-up on a finished task ------------------------------------
    // Handled before the terminal guard: continuing a completed task is the
    // whole point of a multi-turn conversation.
    if (typeof body.message === 'string' && body.message.trim()) {
      if (!isTerminal) {
        throw new ApiError(
          409,
          'This task is still running. Stop it first, or wait for it to finish.'
        );
      }

      continueSession(state, body.message.trim().slice(0, 8000));
      const updated = await persistState(ctx, row.id, state);

      const project = await requireProject(ctx, row.project_id);
      const result = await advanceAndPersist(ctx, updated, project, {
        activeFilePath: typeof body.activeFilePath === 'string' ? body.activeFilePath : null,
        selection: typeof body.selection === 'string' ? body.selection.slice(0, 12000) : null,
      });
      return NextResponse.json(await serialize(ctx, result.row));
    }

    if (isTerminal) {
      throw new ApiError(409, `This task has already ${state.status}.`);
    }

    // ---- cancel ---------------------------------------------------------
    if (body.cancel === true) {
      state.cancelRequested = true;
      state.status = 'cancelled';
      state.pendingRunId = null;
      state.pendingActionId = null;
      state.transcript.push({
        type: 'note',
        content: 'Stopped by the user.',
        at: new Date().toISOString(),
      });

      const updated = await persistState(ctx, row.id, state);
      return NextResponse.json(await serialize(ctx, updated));
    }

    // ---- answer a question ----------------------------------------------
    if (typeof body.answer === 'string' && body.answer.trim()) {
      if (state.status !== 'awaiting_input') {
        throw new ApiError(409, 'This task is not waiting for an answer.');
      }

      resumeAfterInput(state, body.answer.trim().slice(0, 8000));
      const updated = await persistState(ctx, row.id, state);

      const project = await requireProject(ctx, row.project_id);
      const result = await advanceAndPersist(ctx, updated, project);
      return NextResponse.json(await serialize(ctx, result.row));
    }

    // ---- resume after an approval decision -------------------------------
    if (body.approvalResolved === true) {
      if (state.status !== 'awaiting_approval') {
        throw new ApiError(409, 'This task is not waiting for an approval.');
      }
      if (!state.pendingActionId) {
        throw new ApiError(409, 'There is no pending change to resolve.');
      }

      // Read the real action row rather than trusting the client's claim.
      const { data: action } = await ctx.supabase
        .from('ide_agent_actions')
        .select('status, result_log, error_message, files_affected')
        .eq('id', state.pendingActionId)
        .eq('requested_by', ctx.userId)
        .maybeSingle();

      if (!action) throw new ApiError(404, 'The pending change no longer exists.');
      if (action.status === 'pending') {
        throw new ApiError(409, 'That change has not been reviewed yet.');
      }

      const approved = action.status === 'applied';
      const detail = approved
        ? `Applied: ${(action.files_affected ?? []).join(', ') || 'no files'}.`
        : action.status === 'failed'
          ? `The change failed to apply: ${action.error_message ?? 'unknown error'}`
          : 'The change was not applied.';

      resumeAfterApproval(state, { approved, detail });
      const updated = await persistState(ctx, row.id, state);

      const project = await requireProject(ctx, row.project_id);
      const result = await advanceAndPersist(ctx, updated, project);
      return NextResponse.json(await serialize(ctx, result.row));
    }

    throw new ApiError(
      400,
      'Nothing to do. Send { message }, { cancel }, { answer } or { approvalResolved }.'
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
