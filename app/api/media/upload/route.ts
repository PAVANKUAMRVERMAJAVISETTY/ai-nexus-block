import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { uploadMedia } from '@/services/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ATTACHMENTS_PER_REQUEST = 5;

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthenticated request.' },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    const conversationId = String(
      formData.get('conversation_id') ?? '',
    ).trim();

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required.' },
        { status: 400 },
      );
    }

    const files = formData
      .getAll('file')
      .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required.' },
        { status: 400 },
      );
    }

    if (files.length > MAX_ATTACHMENTS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ATTACHMENTS_PER_REQUEST} attachments allowed.` },
        { status: 400 },
      );
    }

    const uploaded = [];

    for (const file of files) {
      uploaded.push(
        await uploadMedia(file, user.id, conversationId),
      );
    }

    return NextResponse.json({
      attachments: uploaded,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Media upload failed.';

    const status =
      /Unsupported|exceeds|empty|required|Maximum/i.test(message)
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
