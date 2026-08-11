import { NextResponse } from 'next/server';
import {
  ApiError,
  describeDbError,
  isUuid,
  requireProject,
  requireUser,
  toErrorResponse,
} from '@/lib/ide/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ide/actions?projectId=<uuid>&status=<status>
 * The audit trail of AI change proposals for a project.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireUser();

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    if (!isUuid(projectId)) throw new ApiError(400, 'A valid projectId is required.');

    await requireProject(ctx, projectId);

    const status = url.searchParams.get('status');
    const limitParam = Number.parseInt(url.searchParams.get('limit') ?? '30', 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 30;

    let query = ctx.supabase
      .from('ide_agent_actions')
      .select('*')
      .eq('project_id', projectId)
      .eq('requested_by', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new ApiError(500, describeDbError(error));

    return NextResponse.json({ actions: data ?? [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}
