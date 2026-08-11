import { NextResponse } from 'next/server';
import { ApiError, enforceRateLimit, requireUser, toErrorResponse } from '@/lib/ide/api';
import { getAccessToken, markConnectionExpired } from '@/lib/ide/github-connection';
import { GitHubApiError, filterRepositories, listRepositories } from '@/lib/github/api';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ide/github/repos?q=<query>
 *
 * Repositories visible to the connected account. The token is used server-side
 * only; the browser receives repository metadata and never a credential.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireUser();
    enforceRateLimit(ctx.userId, 'write');

    const token = await getAccessToken(ctx);

    let repositories;
    try {
      repositories = await listRepositories(token);
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 401) {
        // The token no longer works — record that so the UI prompts a reconnect.
        await markConnectionExpired(ctx);
        throw new ApiError(412, error.message);
      }
      if (error instanceof GitHubApiError) throw new ApiError(error.status, error.message);
      throw error;
    }

    const query = new URL(request.url).searchParams.get('q') ?? '';
    const filtered = filterRepositories(repositories, query);

    return NextResponse.json({
      repositories: filtered,
      total: repositories.length,
      filtered: filtered.length,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
