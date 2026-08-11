import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  RECOVERY_COOKIE,
  RECOVERY_MAX_AGE_SECONDS,
  RECOVERY_PATH,
  safeRedirectPath,
} from '@/lib/auth/recovery';

export const dynamic = 'force-dynamic';

/**
 * Supabase Auth callback.
 *
 * Every link Supabase emails — confirm signup, magic link, password recovery —
 * lands here with a one-time `code`. Until that code is exchanged the visitor
 * has NO session, so a callback that merely redirects sends them to a protected
 * page that bounces them straight back to /login. That is what made the
 * password-reset flow a dead end: the email link worked, but the session it
 * carried was thrown away.
 *
 * Redirect targets are restricted to same-origin paths so this endpoint can
 * never be used as an open redirect off the back of a valid session.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const code = url.searchParams.get('code');
  const type = url.searchParams.get('type');
  const next = safeRedirectPath(url.searchParams.get('next'));

  // Supabase reports failures (expired or already-used link) on the query
  // string rather than by omitting the code.
  const errorCode = url.searchParams.get('error') ?? url.searchParams.get('error_code');
  if (errorCode) {
    const description =
      url.searchParams.get('error_description') ?? 'That link is invalid or has expired.';
    const target = new URL('/login', origin);
    target.searchParams.set('error', description);
    return NextResponse.redirect(target);
  }

  if (!code) {
    const target = new URL('/login', origin);
    target.searchParams.set('error', 'That sign-in link is missing its code. Request a new one.');
    return NextResponse.redirect(target);
  }

  const supabase = await createSupabaseServerClient();

  // Writes the session cookies via the SSR client's cookie adapter.
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // The message is Supabase's own ("code verifier missing", "expired") and
    // contains no secret — the code itself is single-use and now spent.
    const target = new URL('/login', origin);
    target.searchParams.set('error', 'That link is invalid or has expired. Request a new one.');
    return NextResponse.redirect(target);
  }

  // A recovery link must land on the page that actually sets a new password.
  // `type` is not always forwarded through Supabase's verify redirect, so the
  // `next` we set ourselves in resetPassword() is the reliable signal.
  if (type === 'recovery' || next === RECOVERY_PATH) {
    const target = NextResponse.redirect(new URL(RECOVERY_PATH, origin));

    // Marks this session as one that arrived by proving control of the inbox,
    // which is why /update-password may skip the current-password check for it.
    // httpOnly so page scripts cannot forge it; short-lived so a stale tab
    // cannot reuse it later.
    target.cookies.set(RECOVERY_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: RECOVERY_MAX_AGE_SECONDS,
    });

    return target;
  }

  if (next) {
    return NextResponse.redirect(new URL(next, origin));
  }

  // Otherwise send them where they belong. Reading the role here keeps the
  // landing page consistent with the middleware's own routing.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'super_admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', origin));
    }
  }

  return NextResponse.redirect(new URL('/dashboard', origin));
}
