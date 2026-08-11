import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/ide/api';
import {
  exchangeCodeForToken,
  resolveRedirectUri,
  verifyOAuthState,
} from '@/lib/github/oauth';
import { getAuthenticatedUser } from '@/lib/github/api';
import { saveConnection } from '@/lib/ide/github-connection';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ide/github/callback
 *
 * Completes the OAuth flow. Always redirects back into the IDE with a short
 * status code in the query string rather than rendering an error page, so the
 * user ends up somewhere useful either way.
 *
 * The GitHub error text is deliberately not echoed into the URL: it would end
 * up in browser history and server access logs.
 */
function redirectWith(base: string, path: string, params: Record<string, string>) {
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const url = new URL(request.url);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const githubError = url.searchParams.get('error');

  // The user pressed "Cancel" on GitHub's consent screen.
  if (githubError) {
    return redirectWith(origin, '/ide', { github: 'cancelled' });
  }

  const statePayload = verifyOAuthState(state);
  if (!statePayload || !code) {
    return redirectWith(origin, '/ide', { github: 'invalid_state' });
  }

  try {
    const ctx = await requireUser();

    // The user who finishes the flow must be the one who started it.
    // Without this check, an attacker could hand a victim a callback URL and
    // attach the attacker's GitHub account to the victim's Nexus account.
    if (ctx.userId !== statePayload.userId) {
      return redirectWith(origin, '/ide', { github: 'user_mismatch' });
    }

    const redirectUri = resolveRedirectUri(request);
    const { accessToken, scopes } = await exchangeCodeForToken(code, redirectUri);

    // Confirm the token works and capture the display identity in one call.
    const githubUser = await getAuthenticatedUser(accessToken);

    await saveConnection(ctx, { accessToken, scopes, user: githubUser });

    return redirectWith(origin, statePayload.redirectTo, {
      github: 'connected',
      login: githubUser.login,
    });
  } catch (error) {
    // Log server-side (never the token), redirect with a generic marker.
    console.error('[github-callback]', error instanceof Error ? error.message : error);
    return redirectWith(origin, '/ide', { github: 'failed' });
  }
}
