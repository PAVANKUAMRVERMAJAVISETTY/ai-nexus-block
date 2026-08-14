import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AUDIO_SIZE = 10 * 1024 * 1024;

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/m4a',
  'audio/mp4',
]);

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
    const audio = formData.get('audio');

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: 'Audio file is required.' },
        { status: 400 },
      );
    }

    if (audio.size <= 0) {
      return NextResponse.json(
        { error: 'Audio file is empty.' },
        { status: 400 },
      );
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: 'Audio file exceeds the 10 MB limit.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_AUDIO_TYPES.has(audio.type)) {
      return NextResponse.json(
        { error: `Unsupported audio type: ${audio.type || 'unknown'}` },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Speech transcription is not configured.' },
        { status: 503 },
      );
    }

    const upstream = new FormData();
    upstream.append('file', audio, audio.name || 'recording.webm');
    upstream.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1');
    upstream.append('response_format', 'json');

    const response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: upstream,
      },
    );

    if (!response.ok) {
      const details = await response.text();

      return NextResponse.json(
        {
          error: `Transcription provider failed (HTTP ${response.status}).`,
          details:
            process.env.NODE_ENV === 'development' ? details : undefined,
        },
        { status: 502 },
      );
    }

    const result = await response.json();

    return NextResponse.json({
      text: typeof result.text === 'string' ? result.text : '',
      user_id: user.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Transcription failed.',
      },
      { status: 500 },
    );
  }
}
