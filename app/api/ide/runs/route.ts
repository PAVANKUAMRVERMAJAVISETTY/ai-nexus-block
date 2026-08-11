import { NextResponse } from 'next/server';
import {
  ApiError,
  enforceRateLimit,
  describeDbError,
  isUuid,
  readJsonBody,
  requireProject,
  requireUser,
  toErrorResponse,
} from '@/lib/ide/api';
import { UnsafeCommandError, validateCommand } from '@/lib/ide/agent-protocol';
import { isAgentOnline } from '@/lib/ide/agent-auth';
import { isServiceRoleConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ide/runs?projectId=<uuid>&limit=<n>
 * Recent runs for a project, newest first.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireUser();

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    if (!isUuid(projectId)) throw new ApiError(400, 'A valid projectId is required.');

    await requireProject(ctx, projectId);

    const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '25', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 25;

    const { data, error } = await ctx.supabase
      .from('ide_project_runs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new ApiError(500, describeDbError(error));

    return NextResponse.json({ runs: data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/ide/runs — queue a command for the user's local agent.
 *
 * This endpoint NEVER executes anything. It validates the command against the
 * allowlist and writes a `queued` row. Execution happens only when the user's
 * own Nexus Local Development Agent claims the row.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireUser();
    enforceRateLimit(ctx.userId, 'run');

    const body = await readJsonBody(request);

    const projectId = body.projectId;
    if (!isUuid(projectId)) throw new ApiError(400, 'A valid projectId is required.');

    const project = await requireProject(ctx, projectId);

    let validated;
    try {
      validated = validateCommand(body.command);
    } catch (error) {
      if (error instanceof UnsafeCommandError) throw new ApiError(400, error.message);
      throw error;
    }

    // Elevated commands need the client to say it asked the user a second time.
    if (validated.requiresElevatedConfirmation && body.confirmElevated !== true) {
      throw new ApiError(
        428,
        `"${validated.command}" needs explicit confirmation before it can be queued.`
      );
    }

    if (!isServiceRoleConfigured()) {
      throw new ApiError(
        503,
        'Command execution is unavailable: this server has no SUPABASE_SERVICE_ROLE_KEY, so local agents cannot connect.'
      );
    }

    // Report whether an agent is actually listening, so the UI can be honest
    // about a run that will otherwise sit queued indefinitely.
    const agentOnline = await isAgentOnline(ctx);

    const { data: run, error } = await ctx.supabase
      .from('ide_project_runs')
      .insert({
        project_id: project.id,
        user_id: ctx.userId,
        command: validated.command,
        kind: validated.kind,
        status: 'queued',
        triggered_by: body.triggeredBy === 'ai' ? 'ai' : 'user',
        action_id: isUuid(body.actionId) ? body.actionId : null,
      })
      .select('*')
      .single();

    if (error) throw new ApiError(400, describeDbError(error));

    return NextResponse.json(
      {
        run,
        agentOnline,
        message: agentOnline
          ? undefined
          : 'Queued. No Nexus Local Development Agent is currently connected, so this run will start when one comes online.',
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
