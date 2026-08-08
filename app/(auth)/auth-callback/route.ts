import { NextResponse } from 'next/server';

// TODO: Implement Supabase Auth callback handler in a later stage.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    // TODO: Exchange code for session using Supabase Auth.
  }

  return NextResponse.redirect(new URL('/dashboard', url.origin));
}
