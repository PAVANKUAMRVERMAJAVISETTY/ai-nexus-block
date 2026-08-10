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

    const { data: research, error } = await supabase
      .from('user_research')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch research collection.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ research: research || [] });
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
    const { title, category = 'general', url, summary, personal_notes, opinion, pros = [], cons = [], pricing_info, tags = [] } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required.' },
        { status: 400 }
      );
    }

    const { data: newResearch, error } = await supabase
      .from('user_research')
      .insert({
        user_id: user.id,
        title: title.trim(),
        category,
        url,
        summary,
        personal_notes,
        opinion,
        pros,
        cons,
        pricing_info,
        tags,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to create research record.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ research: newResearch });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    const { id, user_id, created_at, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Research ID is required.' },
        { status: 400 }
      );
    }

    const { data: updatedResearch, error } = await supabase
      .from('user_research')
      .update({
        ...updateFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error || !updatedResearch) {
      return NextResponse.json(
        { error: 'Research record not found or update unauthorized.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ research: updatedResearch });
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
    const researchId = searchParams.get('id');

    if (!researchId) {
      return NextResponse.json(
        { error: 'Research ID is required.' },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from('user_research')
      .delete({ count: 'exact' })
      .eq('id', researchId)
      .eq('user_id', user.id);

    if (error || count === 0) {
      return NextResponse.json(
        { error: 'Research record not found or delete unauthorized.' },
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
