/**
 * Storage and retrieval of a user's GitHub connection.
 *
 * SECURITY INVARIANT: the encrypted token columns are never selected into
 * anything that can reach a browser. `getConnection()` returns display-safe
 * fields only; `getAccessToken()` is the single function that decrypts, and it
 * is used exclusively by server-side code that is about to call GitHub or hand
 * a credential to the user's own paired agent.
 */

import { decryptSecret, encryptSecret, tokenFingerprint } from '@/lib/security/crypto';
import { ApiError, describeDbError, type AuthedContext } from './api';
import type { GitHubConnection, GitHubUser } from '@/types/git';

/** Columns safe to return to a client — no credential material. */
const SAFE_COLUMNS =
  'id, user_id, provider, external_id, external_login, avatar_url, scopes, status, connected_at, last_used_at, created_at, updated_at';

export async function getConnection(ctx: AuthedContext): Promise<GitHubConnection | null> {
  const { data, error } = await ctx.supabase
    .from('ide_user_connections')
    .select(SAFE_COLUMNS)
    .eq('user_id', ctx.userId)
    .eq('provider', 'github')
    .maybeSingle();

  if (error) {
    // A missing table means the GitHub migration has not been applied.
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new ApiError(
        503,
        'The GitHub integration tables are not present in your Supabase project. ' +
          'Run database/migrations/20260811000001_nexus_ide_github.sql in the SQL editor.'
      );
    }
    throw new ApiError(500, describeDbError(error));
  }

  return (data as GitHubConnection | null) ?? null;
}

export async function isConnected(ctx: AuthedContext): Promise<boolean> {
  const connection = await getConnection(ctx);
  return connection?.status === 'connected';
}

/**
 * Decrypt and return the access token.
 *
 * Server-side callers only. Never return the result to a client, never log it,
 * never write it to a file, and never place it in a command argument.
 */
export async function getAccessToken(ctx: AuthedContext): Promise<string> {
  const { data, error } = await ctx.supabase
    .from('ide_user_connections')
    .select('id, access_token_encrypted, status')
    .eq('user_id', ctx.userId)
    .eq('provider', 'github')
    .maybeSingle();

  if (error) throw new ApiError(500, describeDbError(error));

  if (!data || !data.access_token_encrypted) {
    throw new ApiError(412, 'GitHub is not connected. Connect GitHub to continue.');
  }
  if (data.status !== 'connected') {
    throw new ApiError(412, 'Your GitHub connection is no longer valid. Reconnect GitHub.');
  }

  const token = decryptSecret(data.access_token_encrypted as string);

  // Best-effort usage timestamp; failure here must not block the operation.
  void ctx.supabase
    .from('ide_user_connections')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => undefined);

  return token;
}

/** Create or refresh the connection after a successful OAuth exchange. */
export async function saveConnection(
  ctx: AuthedContext,
  input: { accessToken: string; scopes: string[]; user: GitHubUser }
): Promise<GitHubConnection> {
  const { data, error } = await ctx.supabase
    .from('ide_user_connections')
    .upsert(
      {
        user_id: ctx.userId,
        provider: 'github',
        external_id: String(input.user.id),
        external_login: input.user.login,
        avatar_url: input.user.avatarUrl,
        access_token_encrypted: encryptSecret(input.accessToken),
        token_fingerprint: tokenFingerprint(input.accessToken),
        scopes: input.scopes,
        status: 'connected',
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )
    .select(SAFE_COLUMNS)
    .single();

  if (error) throw new ApiError(400, describeDbError(error));

  return data as GitHubConnection;
}

/**
 * Remove the stored credential.
 * The row is deleted outright rather than flagged, so no ciphertext lingers.
 */
export async function deleteConnection(ctx: AuthedContext): Promise<void> {
  const { error } = await ctx.supabase
    .from('ide_user_connections')
    .delete()
    .eq('user_id', ctx.userId)
    .eq('provider', 'github');

  if (error) throw new ApiError(400, describeDbError(error));
}

/** Mark a connection unusable after GitHub rejects its token. */
export async function markConnectionExpired(ctx: AuthedContext): Promise<void> {
  await ctx.supabase
    .from('ide_user_connections')
    .update({ status: 'expired' })
    .eq('user_id', ctx.userId)
    .eq('provider', 'github');
}
