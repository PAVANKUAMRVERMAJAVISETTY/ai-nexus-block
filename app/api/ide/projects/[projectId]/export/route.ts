import { NextResponse } from 'next/server';
import {
  ApiError,
  describeDbError,
  requireProject,
  requireUser,
  toErrorResponse,
} from '@/lib/ide/api';
import { createProjectZip } from '@/lib/ide/project-export';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { projectId: string };
}

/**
 * POST /api/ide/projects/:projectId/export
 * GET  /api/ide/projects/:projectId/export
 *
 * Downloads a ZIP archive of the requested project.
 * Enforces authenticated user ownership and excludes sensitive files/keys.
 */
async function handleExport(request: Request, params: { projectId: string }) {
  try {
    const ctx = await requireUser();
    const project = await requireProject(ctx, params.projectId);

    // Query all project files belonging to the project and user
    const { data: files, error } = await ctx.supabase
      .from('ide_project_files')
      .select('file_path, content, is_directory, is_binary')
      .eq('project_id', project.id)
      .eq('user_id', ctx.userId)
      .order('file_path', { ascending: true });

    if (error) throw new ApiError(500, describeDbError(error));

    const zipBytes = await createProjectZip({
      projectName: project.name || 'nexus-project',
      files: files || [],
    });

    const safeSlug = (project.name || 'project')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-');
    const filename = `${safeSlug}-export.zip`;

    return new NextResponse(zipBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  return handleExport(request, params);
}

export async function GET(request: Request, { params }: RouteParams) {
  return handleExport(request, params);
}
