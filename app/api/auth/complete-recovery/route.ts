import { NextResponse } from 'next/server';
import { RECOVERY_COOKIE } from '@/lib/auth/recovery';

export const dynamic = 'force-dynamic';

/**
 * Spend the password-recovery marker.
 *
 * Called once the new password is set. Clearing it means the reduced-friction
 * path (no current password required) cannot be reused on a later visit within
 * the cookie's lifetime.
 *
 * Deleting the cookie only ever removes a capability, so this needs no
 * authorization check of its own.
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(RECOVERY_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });

  return response;
}
