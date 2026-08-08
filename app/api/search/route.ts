import { NextResponse } from 'next/server';

// TODO: Implement search endpoint in a later stage.
// This route will handle full-text and vector search queries.
export async function GET(request: Request) {
  return NextResponse.json(
    { error: 'Search is not yet implemented.' },
    { status: 501 }
  );
}
