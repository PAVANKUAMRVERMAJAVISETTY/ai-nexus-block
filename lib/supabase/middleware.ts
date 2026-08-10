import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'placeholder-anon-key';


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

  // 2. Protection for Workspace routes (/dashboard, /assistant, /profile, /files, /research, /debug, /notes, /conversations, /decisions)
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


