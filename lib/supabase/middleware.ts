import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { resolveSupabaseEnv } from './env';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url: supabaseUrl, anonKey: supabaseKey } = resolveSupabaseEnv();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          supabaseResponse = NextResponse.next({ request });
          supabaseResponse.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          supabaseResponse = NextResponse.next({ request });
          supabaseResponse.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectUrl = request.nextUrl.clone();
  const pathname = redirectUrl.pathname;

  // 1. Protection for Admin routes (/admin and /admin/*)
  if (pathname.startsWith('/admin')) {
    if (!user) {
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Verify role server-side from public.profiles database table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      redirectUrl.pathname = '/dashboard';
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 2. Protection for Workspace routes.
  // Anything reachable only by an authenticated user MUST be listed here —
  // a route that is missing from this array is publicly reachable.
  const workspaceRoutes = [
    '/dashboard',
    '/assistant',
    '/profile',
    '/files',
    '/research',
    '/debug',
    '/notes',
    '/conversations',
    '/decisions',
    '/ide',
    // Setting a password requires a session — from a normal sign-in, or from
    // the recovery link that /auth-callback has just exchanged. Enforcing it
    // here means an unauthenticated request is refused with a redirect before
    // the page renders, rather than relying on the page's own check arriving
    // partway through a streamed response.
    '/update-password',
  ];

  const isWorkspaceRoute = workspaceRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isWorkspaceRoute && !user) {
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 3. Redirect logged-in users away from /login and /signup
  if ((pathname === '/login' || pathname === '/signup') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'super_admin') {
      redirectUrl.pathname = '/admin/dashboard';
    } else {
      redirectUrl.pathname = '/assistant';
    }
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}


