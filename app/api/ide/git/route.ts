import { NextResponse } from 'next/server';
import {
  ApiError,
  describeDbError,
  enforceRateLimit,
  isUuid,
  readJsonBody,
  requireProject,
  requireUser,
  toErrorResponse,
} from '@/lib/ide/api';
import {
  InvalidGitOperationError,
  describeGitOperation,
  elevatedWarning,
  isElevatedOperation,
  validateGitOperation,
} from '@/lib/ide/git-protocol';
import { AGENT_ONLINE_WINDOW_MS } from '@/lib/ide/agent-protocol';
import { isServiceRoleConfigured } from '@/lib/supabase/admin';
import { isConnected } from '@/lib/ide/github-connection';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ide/git — queue a structured Git operation.
 *
 * Like every other run, this only ENQUEUES. The server never invokes git. The
 * operation is validated here and again inside the agent, and the agent builds
 * argv from the typed fields, so no user text is ever parsed as a command.
 *
 * Credentials are not stored on the row: they are attached at hand-off in the
 * poll endpoint and exist only for the duration of that response.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireUser();
    enforceRateLimit(ctx.userId, 'run');

    const body = await readJsonBody(request);

    const projectId = body.projectId;
    if (!isUuid(projectId)) throw new ApiError(400, 'A valid projectId is required.');

    const project = await requireProject(ctx, projectId);

    let operation;
    try {
      operation = validateGitOperation(body.operation);
    } catch (error) {
      if (error instanceof InvalidGitOperationError) throw new ApiError(400, error.message);
      throw error;
    }

    // Destructive operations need a second, explicit confirmation from the UI.
    if (isElevatedOperation(operation.op) && body.confirmElevated !== true) {
      throw new ApiError(
        428,
        elevatedWarning(operation) ??
          'This operation needs explicit confirmation before it can run.'
      );
    }

    // Network operations need a live GitHub connection to authenticate with.
    const needsGitHub = ['clone', 'push', 'pull', 'fetch'].includes(operation.op);
    if (needsGitHub && !(await isConnected(ctx))) {
      throw new ApiError(
        412,
        'GitHub is not connected. Connect GitHub before running operations that reach the remote.'
      );
    }

    if (!isServiceRoleConfigured()) {
      throw new ApiError(
        503,
        'Git operations are unavailable: this server has no SUPABASE_SERVICE_ROLE_KEY, so local agents cannot connect.'
      );
    }

    // Report agent liveness so the UI never implies work is running when it is
    // actually sitting in a queue nobody is reading.
    const { data: devices } = await ctx.supabase
      .from('ide_agent_devices')
      .select('last_seen_at')
      .eq('user_id', ctx.userId)
      .eq('status', 'active')
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .limit(1);

    const lastSeen = (devices ?? [])[0]?.last_seen_at as string | undefined;
    const agentOnline = Boolean(
      lastSeen && Date.now() - new Date(lastSeen).getTime() <= AGENT_ONLINE_WINDOW_MS
    );

    const { data: run, error } = await ctx.supabase
      .from('ide_project_runs')
      .insert({
        project_id: project.id,
        user_id: ctx.userId,
        command: describeGitOperation(operation),
        kind: 'git',
        status: 'queued',
        triggered_by: body.triggeredBy === 'ai' ? 'ai' : 'user',
        // The operation is persisted WITHOUT credentials.
        operation,
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
          : 'Queued. No Nexus Local Development Agent is connected, so this will run when one comes online.',
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
