import { NextResponse } from 'next/server';
import { requireUser, toErrorResponse, ApiError } from '@/lib/ide/api';
import {
  buildAuthorizeUrl,
  createOAuthState,
  isGitHubConfigured,
  resolveRedirectUri,
} from '@/lib/github/oauth';
import { isEncryptionConfigured } from '@/lib/security/crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ide/github/connect
 *
 * Starts the OAuth flow. Redirects the signed-in user to GitHub with a signed,
 * expiring state token bound to their user id. No secret is exposed: the
 * client id is public by design and the client secret is never sent here.
 */
export async function GET(request: Request) {
  try {
    const ctx = await requireUser();

    if (!isGitHubConfigured()) {
      throw new ApiError(
        503,
        'GitHub integration is not configured on this server. An administrator must set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.'
      );
    }
    if (!isEncryptionConfigured()) {
      throw new ApiError(
        503,
        'GitHub integration is unavailable: NEXUS_ENCRYPTION_KEY is not configured, so access tokens cannot be stored securely.'
      );
    }

    const url = new URL(request.url);
    const requested = url.searchParams.get('redirectTo') ?? '/ide';
    // Only same-site paths — an absolute URL here would be an open redirect.
    const redirectTo = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/ide';

    const state = createOAuthState(ctx.userId, redirectTo);
    const redirectUri = resolveRedirectUri(request);

    return NextResponse.redirect(buildAuthorizeUrl(state, redirectUri));
  } catch (error) {
    return toErrorResponse(error);
  }
}
