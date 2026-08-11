import { NextResponse } from 'next/server';
import {
  ApiError,
  describeDbError,
  enforceRateLimit,
  optionalString,
  readJsonBody,
  requireString,
  requireUser,
  slugify,
  toErrorResponse,
} from '@/lib/ide/api';
import { getAccessToken, markConnectionExpired, getConnection } from '@/lib/ide/github-connection';
import { GitHubApiError, getRepository, parseFullName } from '@/lib/github/api';
import { validateBranchName, validateRepoUrl } from '@/lib/ide/git-protocol';
import { isServiceRoleConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ide/github/import
 *
 * Creates a Nexus project linked to a GitHub repository and queues the clone
 * for the user's local agent.
 *
 * The server does NOT clone anything. It verifies access via the GitHub API,
 * records the link, and enqueues a `clone` operation. The repository only ever
 * lands on the user's own machine, through their own paired agent.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireUser();
    enforceRateLimit(ctx.userId, 'write');

    const body = await readJsonBody(request);
    const fullName = requireString(body, 'fullName', 200);
    const { owner, name } = parseFullName(fullName);

    const connection = await getConnection(ctx);
    if (!connection || connection.status !== 'connected') {
      throw new ApiError(412, 'GitHub is not connected. Connect GitHub before importing.');
    }

    const token = await getAccessToken(ctx);

    // Confirm the connection can actually see the repository before creating
    // anything, so a typo or a revoked grant fails here rather than halfway.
    let repository;
    try {
      repository = await getRepository(token, owner, name);
    } catch (error) {
      if (error instanceof GitHubApiError) {
        if (error.status === 401) await markConnectionExpired(ctx);
        throw new ApiError(error.status === 404 ? 404 : 412, error.message);
      }
      throw error;
    }

    const branch = body.branch
      ? validateBranchName(body.branch)
      : validateBranchName(repository.defaultBranch);

    const projectName =
      optionalString(body, 'projectName', 120) ?? repository.name;

    // Unique slug per user, same approach as ordinary project creation.
    const baseSlug = slugify(projectName);
    const { data: existingSlugs } = await ctx.supabase
      .from('ide_projects')
      .select('slug')
      .eq('user_id', ctx.userId)
      .like('slug', `${baseSlug}%`);

    const taken = new Set((existingSlugs ?? []).map((row: { slug: string | null }) => row.slug));
    let slug = baseSlug;
    let suffix = 2;
    while (taken.has(slug)) slug = `${baseSlug}-${suffix++}`;

    const { data: project, error: projectError } = await ctx.supabase
      .from('ide_projects')
      .insert({
        user_id: ctx.userId,
        name: projectName,
        slug,
        description: repository.description,
        template: 'github_import',
        framework: repository.language ?? 'Unknown',
        primary_language: (repository.language ?? 'typescript').toLowerCase(),
        git_repository_url: repository.htmlUrl,
        github_repo_full_name: repository.fullName,
        github_default_branch: repository.defaultBranch,
        github_connection_id: connection.id,
        workspace_hint: slug,
        status: 'active',
        last_opened_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (projectError || !project) {
      throw new ApiError(400, describeDbError(projectError ?? { message: 'Insert failed.' }));
    }

    // Record the project → repository link in the existing connections table.
    await ctx.supabase.from('ide_project_connections').upsert(
      {
        project_id: project.id,
        user_id: ctx.userId,
        provider: 'github',
        status: 'connected',
        external_id: String(repository.id),
        display_name: repository.fullName,
        scopes: connection.scopes,
        metadata: {
          defaultBranch: repository.defaultBranch,
          private: repository.private,
          canPush: repository.canPush,
          htmlUrl: repository.htmlUrl,
        },
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,provider' }
    );

    // Queue the clone. Without an agent this row simply waits — which the
    // response says explicitly rather than implying the clone has happened.
    const cloneQueued = isServiceRoleConfigured();
    let runId: string | null = null;

    if (cloneQueued) {
      const { data: run, error: runError } = await ctx.supabase
        .from('ide_project_runs')
        .insert({
          project_id: project.id,
          user_id: ctx.userId,
          command: `git clone ${repository.htmlUrl}`,
          kind: 'git',
          status: 'queued',
          triggered_by: 'user',
          operation: {
            op: 'clone',
            repoUrl: validateRepoUrl(repository.htmlUrl),
            branch,
          },
        })
        .select('id')
        .single();

      if (runError) throw new ApiError(400, describeDbError(runError));
      runId = run?.id ?? null;
    }

    return NextResponse.json(
      {
        project,
        repository: {
          fullName: repository.fullName,
          defaultBranch: repository.defaultBranch,
          private: repository.private,
          canPush: repository.canPush,
        },
        branch,
        cloneRunId: runId,
        cloneQueued,
        message: cloneQueued
          ? 'Project created. The clone is queued and will run when your local agent picks it up.'
          : 'Project created and linked. Command execution is unavailable on this server, so the repository was not cloned locally.',
      },
      { status: 201 }
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
