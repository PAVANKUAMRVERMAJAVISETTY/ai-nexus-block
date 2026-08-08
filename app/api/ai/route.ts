import { NextResponse } from 'next/server';

// TODO: Implement AI assistant endpoint in a later stage.
// This route will proxy requests to the selected AI provider.
export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'AI assistant is not yet implemented.' },
    { status: 501 }
  );
}
