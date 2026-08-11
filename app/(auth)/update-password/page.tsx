import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RECOVERY_COOKIE } from '@/lib/auth/recovery';
import { UpdatePasswordForm } from '@/features/auth/components/update-password-form';

export const dynamic = 'force-dynamic';

/**
 * Set a new password.
 *
 * Reached two ways:
 *  - from a recovery email, where control of the inbox has just been proven, so
 *    the current password is not asked for (the user does not know it);
 *  - directly while signed in, where it IS asked for, so that an unattended
 *    logged-in browser cannot be used to take over the account.
 *
 * Which mode applies is decided here, on the server, from an httpOnly cookie
 * only /auth-callback can set. The client cannot choose the easier path.
 */
export default async function UpdatePasswordPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Supabase requires a session to change a password. Without one there is
  // nothing this page can do, so send them to request a fresh link.
  if (!user) {
    redirect('/forgot-password');
  }

  const isRecovery = cookies().get(RECOVERY_COOKIE)?.value === '1';

  return <UpdatePasswordForm email={user.email ?? ''} isRecovery={isRecovery} />;
}
