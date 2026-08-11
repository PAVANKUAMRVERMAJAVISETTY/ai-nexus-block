import { NextResponse } from 'next/server';
import {
  ApiError,
  enforceRateLimit,
  isUuid,
  readJsonBody,
  requireProject,
  requireString,
  requireUser,
  toErrorResponse,
} from '@/lib/ide/api';
import { advanceAndPersist, createSession } from '@/lib/ide/agent-session-service';
import { isAssistantAvailable } from '@/lib/ai/nexus-assistant';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/ide/agent-session — start a coding task.
 *
 * Creates the session, advances it as far as one request allows, then returns.
 * The client polls the session route to keep it moving; the loop parks on
 * approvals, questions, and queued commands rather than blocking here.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireUser();
    enforceRateLimit(ctx.userId, 'ai');

    const body = await readJsonBody(request);

    const projectId = body.projectId;
    if (!isUuid(projectId)) throw new ApiError(400, 'A valid projectId is required.');

    const project = await requireProject(ctx, projectId);
    const goal = requireString(body, 'goal', 8000);

    if (!isAssistantAvailable()) {
      throw new ApiError(
        503,
        'The assistant is unavailable: no AI backend is configured on this server.'
      );
    }

    const row = await createSession(ctx, {
      projectId: project.id,
      goal,
      conversationId: isUuid(body.conversationId) ? (body.conversationId as string) : null,
    });

    const result = await advanceAndPersist(ctx, row, project, {
      activeFilePath: typeof body.activeFilePath === 'string' ? body.activeFilePath : null,
      selection: typeof body.selection === 'string' ? body.selection.slice(0, 12000) : null,
    });

    return NextResponse.json(
      {
        session: result.row,
        verifications: result.verifications,
        filesChanged: result.filesChanged,
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** GET /api/ide/agent-session?projectId= — recent sessions for a project. */
export async function GET(request: Request) {
  try {
    const ctx = await requireUser();

    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!isUuid(projectId)) throw new ApiError(400, 'A valid projectId is required.');

    await requireProject(ctx, projectId);

    const { data } = await ctx.supabase
      .from('ide_agent_sessions')
      .select('id, goal, status, summary, success, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ sessions: data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}
