import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthenticated request.' },
        { status: 401 }
      );
    }

    const { data: files, error } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch user files.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ files: files || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

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
        { status: 401 }
      );
    }

    const body = await request.json();
    const { filename, file_path, file_size, mime_type = 'application/octet-stream', category = 'general', title, description } = body;

    if (!filename || !file_path) {
      return NextResponse.json(
        { error: 'Filename and file_path are required.' },
        { status: 400 }
      );
    }

    const { data: newFile, error } = await supabase
      .from('user_files')
      .insert({
        user_id: user.id,
        filename,
        file_path,
        file_size: file_size || 0,
        mime_type,
        category,
        title: title || filename,
        description,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to create file record.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ file: newFile });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthenticated request.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required.' },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from('user_files')
      .delete({ count: 'exact' })
      .eq('id', fileId)
      .eq('user_id', user.id);

    if (error || count === 0) {
      return NextResponse.json(
        { error: 'File not found or delete unauthorized.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
