import { NextResponse } from 'next/server';

// TODO: Implement recommendations endpoint in a later stage.
// This route will generate AI-powered tool recommendations.
export async function POST(request: Request) {
  return NextResponse.json(
    { error: 'Recommendations are not yet implemented.' },
    { status: 501 }
  );
}
