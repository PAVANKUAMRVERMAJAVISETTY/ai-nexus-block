/**
 * GitHub OAuth (server-side only).
 *
 * Uses the OAuth App authorization-code flow. The client secret and the access
 * token exist only on the server: no token is ever sent to the browser, put in
 * a NEXT_PUBLIC_ variable, or written to localStorage.
 *
 * CSRF: the `state` parameter is an HMAC-signed, expiring token bound to the
 * signed-in user. The callback verifies the signature, the expiry, and that the
 * user completing the flow is the one who started it — so an attacker cannot
 * trick a victim into attaching the attacker's GitHub account.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';

/** Read access to repositories, plus the ability to push. */
export const GITHUB_SCOPES = ['repo', 'read:user'] as const;

/** OAuth state is only valid briefly. */
const STATE_TTL_MS = 10 * 60 * 1000;

export class GitHubNotConfiguredError extends Error {
  constructor() {
    super(
      'GitHub integration is not configured on this server. An administrator must set ' +
        'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.'
    );
    this.name = 'GitHubNotConfiguredError';
  }
}

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export function isGitHubConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function getOAuthConfig(): GitHubOAuthConfig {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new GitHubNotConfiguredError();
  return { clientId, clientSecret };
}

/**
 * Secret used to sign the OAuth state.
 * Falls back to the client secret so the flow still works when a dedicated
 * signing key has not been provisioned — both are server-only values.
 */
function stateSigningKey(): string {
  return (
    process.env.NEXUS_ENCRYPTION_KEY ||
    process.env.GITHUB_CLIENT_SECRET ||
    ''
  );
}

/** Build a signed state token bound to this user. */
export function createOAuthState(userId: string, redirectTo: string): string {
  const payload = JSON.stringify({
    u: userId,
    r: redirectTo,
    n: randomBytes(12).toString('base64url'),
    e: Date.now() + STATE_TTL_MS,
  });

  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = createHmac('sha256', stateSigningKey()).update(encoded).digest('base64url');

  return `${encoded}.${signature}`;
}

export interface OAuthStatePayload {
  userId: string;
  redirectTo: string;
}

/**
 * Verify a state token. Returns null on any failure — a bad signature, an
 * expired token, or a malformed payload are all equally "reject this callback".
 */
export function verifyOAuthState(state: unknown): OAuthStatePayload | null {
  if (typeof state !== 'string' || !state.includes('.')) return null;

  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) return null;

  const expected = createHmac('sha256', stateSigningKey()).update(encoded).digest('base64url');

  // Constant-time compare so the signature cannot be discovered by timing.
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(provided, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (typeof payload.u !== 'string' || typeof payload.e !== 'number') return null;
    if (Date.now() > payload.e) return null;

    return {
      userId: payload.u,
      redirectTo: typeof payload.r === 'string' ? payload.r : '/ide',
    };
  } catch {
    return null;
  }
}

/** Build the URL the user is sent to in order to authorize. */
export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const { clientId } = getOAuthConfig();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: GITHUB_SCOPES.join(' '),
    state,
    allow_signup: 'false',
  });

  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export interface TokenExchangeResult {
  accessToken: string;
  scopes: string[];
  tokenType: string;
}

/** Exchange the authorization code for an access token. */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<TokenExchangeResult> {
  const { clientId, clientSecret } = getOAuthConfig();

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub rejected the token exchange (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    scope?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
  };

  if (data.error || !data.access_token) {
    // GitHub's error_description is safe to surface; it never contains a token.
    throw new Error(data.error_description || data.error || 'GitHub did not return an access token.');
  }

  return {
    accessToken: data.access_token,
    scopes: data.scope ? data.scope.split(',').map((s) => s.trim()).filter(Boolean) : [],
    tokenType: data.token_type ?? 'bearer',
  };
}

/** Revoke an access token so disconnecting truly ends GitHub's access. */
export async function revokeToken(accessToken: string): Promise<boolean> {
  try {
    const { clientId, clientSecret } = getOAuthConfig();
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch(`https://api.github.com/applications/${clientId}/token`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ access_token: accessToken }),
    });

    // 204 = revoked, 404 = already gone. Both mean "no longer valid".
    return response.status === 204 || response.status === 404;
  } catch {
    // Local disconnect still proceeds; the user can revoke in GitHub settings.
    return false;
  }
}

/** Absolute callback URL, derived from the request so it works in any environment. */
export function resolveRedirectUri(request: Request): string {
  const configured = process.env.GITHUB_OAUTH_REDIRECT_URI;
  if (configured) return configured;

  const url = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');

  const host = forwardedHost ?? url.host;
  const protocol = forwardedProto ?? url.protocol.replace(':', '');

  return `${protocol}://${host}/api/ide/github/callback`;
}
