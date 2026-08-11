import { updateSession } from '@/lib/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Headers Next.js uses internally to mark a request as an internal subrequest.
 * CVE-2025-29927 allowed a client to send `x-middleware-subrequest` and have
 * middleware skipped entirely — which, in this app, is the whole of
 * authentication. The framework fix is in place (Next 13.5.9+), and stripping
 * these here as well means a downgrade, a proxy that re-adds them, or a future
 * regression cannot silently reopen the hole.
 */
const RESERVED_INTERNAL_HEADERS = [
  'x-middleware-subrequest',
  'x-middleware-prefetch',
  'x-nextjs-data',
  'x-middleware-invoke',
];

export async function middleware(request: NextRequest) {
  const spoofed = RESERVED_INTERNAL_HEADERS.filter((header) =>
    request.headers.has(header)
  );

  if (spoofed.length > 0) {
    // No legitimate browser sends these. Rebuild the request without them and
    // record the attempt — repeated hits here are an active probe, not noise.
    console.warn(
      `[security] stripped reserved internal header(s) ${spoofed.join(', ')} from ${request.nextUrl.pathname}`
    );

    const sanitized = new Headers(request.headers);
    for (const header of RESERVED_INTERNAL_HEADERS) sanitized.delete(header);

    return updateSession(
      new NextRequest(request.nextUrl, {
        headers: sanitized,
        method: request.method,
        body: request.body,
        redirect: request.redirect,
        signal: request.signal,
        // @ts-expect-error - duplex is required by undici for streamed bodies
        duplex: 'half',
      })
    );
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
