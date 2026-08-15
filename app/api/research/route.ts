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

    const mappedResearch = (research || []).map((row: any) => ({
      ...row,
      opinion: row.user_opinion ?? row.opinion ?? null,
      user_opinion: row.user_opinion ?? row.opinion ?? null,
      personal_notes: row.user_notes ?? row.personal_notes ?? null,
      user_notes: row.user_notes ?? row.personal_notes ?? null,
      url: row.source_url ?? row.url ?? null,
      source_url: row.source_url ?? row.url ?? null,
    }));

    return NextResponse.json({ research: mappedResearch });
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
    const {
      title,
      category = 'general',
      url,
      source_url,
      summary,
      personal_notes,
      user_notes,
      opinion,
      user_opinion,
      pros = [],
      cons = [],
      pricing_info,
      tags = [],
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required.' },
        { status: 400 }
      );
    }

    const finalSourceUrl = source_url || url || null;
    const finalUserNotes = user_notes || personal_notes || null;
    const finalUserOpinion = user_opinion || opinion || null;

    const payloadPrimary: Record<string, any> = {
      user_id: user.id,
      title: title.trim(),
      category,
      source_url: finalSourceUrl,
      summary: summary || null,
      user_notes: finalUserNotes,
      user_opinion: finalUserOpinion,
      pros,
      cons,
      pricing_info: pricing_info || null,
      tags,
    };

    let { data: newResearch, error } = await supabase
      .from('user_research')
      .insert(payloadPrimary)
      .select('*')
      .single();

    if (error) {
      // Fallback mapping if schema expects 'opinion' / 'personal_notes' / 'url'
      const payloadFallback: Record<string, any> = {
        user_id: user.id,
        title: title.trim(),
        category,
        source_url: finalSourceUrl,
        url: finalSourceUrl,
        summary: summary || null,
        personal_notes: finalUserNotes,
        opinion: finalUserOpinion,
        pros,
        cons,
        pricing_info: pricing_info || null,
        tags,
      };

      const retryRes = await supabase
        .from('user_research')
        .insert(payloadFallback)
        .select('*')
        .single();

      if (retryRes.error) {
        return NextResponse.json(
          { error: retryRes.error.message || 'Failed to create research record.' },
          { status: 400 }
        );
      }
      newResearch = retryRes.data;
    }

    const mapped = {
      ...newResearch,
      opinion: newResearch.user_opinion ?? newResearch.opinion ?? null,
      user_opinion: newResearch.user_opinion ?? newResearch.opinion ?? null,
      personal_notes: newResearch.user_notes ?? newResearch.personal_notes ?? null,
      user_notes: newResearch.user_notes ?? newResearch.personal_notes ?? null,
      url: newResearch.source_url ?? newResearch.url ?? null,
      source_url: newResearch.source_url ?? newResearch.url ?? null,
    };

    return NextResponse.json({ research: mapped });
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
    const { id, user_id, created_at, opinion, personal_notes, url, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Research ID is required.' },
        { status: 400 }
      );
    }

    const patchPayload: Record<string, any> = { ...updateFields };
    if (opinion !== undefined || updateFields.user_opinion !== undefined) {
      patchPayload.user_opinion = updateFields.user_opinion ?? opinion;
      patchPayload.opinion = updateFields.user_opinion ?? opinion;
    }
    if (personal_notes !== undefined || updateFields.user_notes !== undefined) {
      patchPayload.user_notes = updateFields.user_notes ?? personal_notes;
      patchPayload.personal_notes = updateFields.user_notes ?? personal_notes;
    }
    if (url !== undefined || updateFields.source_url !== undefined) {
      patchPayload.source_url = updateFields.source_url ?? url;
      patchPayload.url = updateFields.source_url ?? url;
    }

    let { data: updatedResearch, error } = await supabase
      .from('user_research')
      .update({
        ...patchPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      // Retry stripped payload if column mismatch occurs
      delete patchPayload.opinion;
      delete patchPayload.personal_notes;
      delete patchPayload.url;

      const retryRes = await supabase
        .from('user_research')
        .update({
          ...patchPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (retryRes.error || !retryRes.data) {
        return NextResponse.json(
          { error: 'Research record not found or update unauthorized.' },
          { status: 404 }
        );
      }
      updatedResearch = retryRes.data;
    }

    const mapped = {
      ...updatedResearch,
      opinion: updatedResearch.user_opinion ?? updatedResearch.opinion ?? null,
      user_opinion: updatedResearch.user_opinion ?? updatedResearch.opinion ?? null,
      personal_notes: updatedResearch.user_notes ?? updatedResearch.personal_notes ?? null,
      user_notes: updatedResearch.user_notes ?? updatedResearch.personal_notes ?? null,
      url: updatedResearch.source_url ?? updatedResearch.url ?? null,
      source_url: updatedResearch.source_url ?? updatedResearch.url ?? null,
    };

    return NextResponse.json({ research: mapped });
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
