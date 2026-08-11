import { NextResponse } from 'next/server';
import { ApiError, isUuid, toErrorResponse } from '@/lib/ide/api';
import { requireAgentDevice, requireAgentProject } from '@/lib/ide/agent-auth';
import { normalizeProjectPath } from '@/lib/ide/paths';
import type { AgentWorkspaceFile, AgentWorkspaceResponse } from '@/lib/ide/agent-protocol';

export const dynamic = 'force-dynamic';

/** Ceiling on a single sync payload, so a large project cannot stall the agent. */
const MAX_SYNC_BYTES = 8 * 1024 * 1024;

/**
 * GET /api/ide/agent/workspace?projectId=<uuid>
 *
 * Returns the project's files so the agent can materialize them on local disk
 * before running a command. Device-token authenticated; the project is checked
 * against the device owner, so a token for one user can never read another
 * user's workspace.
 *
 * Paths are re-normalized here as a final guard: the agent joins them onto its
 * workspace root, so a traversal sequence surviving to this point would escape
 * the sandbox directory.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireAgentDevice(request);

    const projectId = new URL(request.url).searchParams.get('projectId');
    if (!isUuid(projectId)) throw new ApiError(400, 'A valid projectId is required.');

    const project = await requireAgentProject(ctx, projectId);

    const { data, error } = await ctx.admin
      .from('ide_project_files')
      .select('file_path, content, is_directory, is_binary, size')
      .eq('project_id', project.id)
      .eq('user_id', ctx.userId)
      .order('file_path', { ascending: true });

    if (error) throw new ApiError(500, 'Could not read the project workspace.');

    const files: AgentWorkspaceFile[] = [];
    let totalBytes = 0;
    let truncated = false;

    for (const row of (data ?? []) as {
      file_path: string;
      content: string;
      is_directory: boolean;
      is_binary: boolean;
      size: number;
    }[]) {
      if (row.is_binary) continue;

      let safePath: string;
      try {
        safePath = normalizeProjectPath(row.file_path);
      } catch {
        // Defence in depth: skip anything that would not pass validation today.
        continue;
      }

      totalBytes += row.size || 0;
      if (totalBytes > MAX_SYNC_BYTES) {
        truncated = true;
        break;
      }

      files.push({
        path: safePath,
        content: row.is_directory ? '' : row.content ?? '',
        isDirectory: row.is_directory,
      });
    }

    const response: AgentWorkspaceResponse = {
      projectId: project.id,
      projectName: project.name,
      workspaceDir: project.workspace_hint || project.id,
      files,
      truncated,
    };

    return NextResponse.json(response);
  } catch (error) {
    return toErrorResponse(error);
  }
}
