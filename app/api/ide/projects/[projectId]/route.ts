import { NextResponse } from 'next/server';
import {
  ApiError,
  describeDbError,
  optionalString,
  readJsonBody,
  requireProject,
  requireUser,
  toErrorResponse,
} from '@/lib/ide/api';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { projectId: string };
}

/** GET /api/ide/projects/:id — project detail plus lightweight counters. */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    const project = await requireProject(ctx, params.projectId);

    const [{ count: fileCount }, { data: recentRuns }, { count: pendingActions }] =
      await Promise.all([
        ctx.supabase
          .from('ide_project_files')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('is_directory', false),
        ctx.supabase
          .from('ide_project_runs')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })
          .limit(5),
        ctx.supabase
          .from('ide_agent_actions')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .eq('status', 'pending'),
      ]);

    // Touch last_opened_at so the launcher can order by recency.
    await ctx.supabase
      .from('ide_projects')
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', project.id)
      .eq('user_id', ctx.userId);

    return NextResponse.json({
      project,
      stats: {
        fileCount: fileCount ?? 0,
        pendingActions: pendingActions ?? 0,
      },
      recentRuns: recentRuns ?? [],
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** PATCH /api/ide/projects/:id — rename, re-describe, or archive. */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    const project = await requireProject(ctx, params.projectId);
    const body = await readJsonBody(request);

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = optionalString(body, 'name', 120);
      if (!name) throw new ApiError(400, 'Project name cannot be empty.');
      updates.name = name;
    }
    if (body.description !== undefined) {
      updates.description = optionalString(body, 'description', 1000);
    }
    if (body.git_repository_url !== undefined) {
      updates.git_repository_url = optionalString(body, 'git_repository_url', 500);
    }
    if (body.status !== undefined) {
      if (body.status !== 'active' && body.status !== 'archived') {
        throw new ApiError(400, 'status must be "active" or "archived".');
      }
      updates.status = body.status;
    }
    if (body.settings !== undefined) {
      if (typeof body.settings !== 'object' || body.settings === null || Array.isArray(body.settings)) {
        throw new ApiError(400, 'settings must be an object.');
      }
      updates.settings = body.settings;
    }

    if (!Object.keys(updates).length) {
      throw new ApiError(400, 'No supported fields to update.');
    }

    const { data, error } = await ctx.supabase
      .from('ide_projects')
      .update(updates)
      .eq('id', project.id)
      .eq('user_id', ctx.userId)
      .select('*')
      .single();

    if (error) throw new ApiError(400, describeDbError(error));

    return NextResponse.json({ project: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * DELETE /api/ide/projects/:id
 * Requires ?confirm=<project name> so a stray request cannot destroy a workspace.
 * Files, runs, logs, problems and actions cascade at the database level.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    const project = await requireProject(ctx, params.projectId);

    const confirm = new URL(request.url).searchParams.get('confirm');
    if (confirm !== project.name) {
      throw new ApiError(
        400,
        'Deletion requires ?confirm=<exact project name>. Nothing was deleted.'
      );
    }

    const { error } = await ctx.supabase
      .from('ide_projects')
      .delete()
      .eq('id', project.id)
      .eq('user_id', ctx.userId);

    if (error) throw new ApiError(400, describeDbError(error));

    return NextResponse.json({ success: true, deleted: project.id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
