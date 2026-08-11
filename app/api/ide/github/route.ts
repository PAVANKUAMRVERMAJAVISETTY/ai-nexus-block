import { NextResponse } from 'next/server';
import { requireUser, toErrorResponse } from '@/lib/ide/api';
import {
  deleteConnection,
  getAccessToken,
  getConnection,
} from '@/lib/ide/github-connection';
import { isGitHubConfigured } from '@/lib/github/oauth';
import { revokeToken } from '@/lib/github/oauth';
import { isEncryptionConfigured } from '@/lib/security/crypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ide/github — connection status for the signed-in user.
 * Returns display-safe fields only; no credential material.
 */
export async function GET() {
  try {
    const ctx = await requireUser();
    const connection = await getConnection(ctx);

    return NextResponse.json({
      configured: isGitHubConfigured() && isEncryptionConfigured(),
      connected: connection?.status === 'connected',
      connection: connection
        ? {
            login: connection.external_login,
            avatarUrl: connection.avatar_url,
            scopes: connection.scopes,
            status: connection.status,
            connectedAt: connection.connected_at,
          }
        : null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * DELETE /api/ide/github — disconnect.
 *
 * Revokes the token with GitHub first so access genuinely ends, then deletes
 * the stored ciphertext. If revocation fails the local record is still removed
 * and the response says so, rather than reporting a clean disconnect.
 */
export async function DELETE() {
  try {
    const ctx = await requireUser();

    let revoked = false;
    try {
      const token = await getAccessToken(ctx);
      revoked = await revokeToken(token);
    } catch {
      // No usable token to revoke; deleting the row is still correct.
    }

    await deleteConnection(ctx);

    return NextResponse.json({
      success: true,
      revokedAtGitHub: revoked,
      message: revoked
        ? 'GitHub disconnected and the access token was revoked.'
        : 'GitHub disconnected locally. If you want to be certain, also remove this app under GitHub → Settings → Applications.',
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
