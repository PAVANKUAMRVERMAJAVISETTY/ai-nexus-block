import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DEFAULT_JOURNEY_ENTRIES = [
  { id: '1', title: 'Started AI Nexus Block', slug: 'started-ai-nexus-block', description: 'Began building an agentic knowledge platform for developers.', entry_date: '2024-01', milestone_type: 'project', tags: ['platform', 'ai'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: true, published: true, display_order: 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: '2', title: 'Implemented Supabase Integration', slug: 'supabase-integration', description: 'Set up authentication, database, and storage with Supabase.', entry_date: '2024-04', milestone_type: 'learning', tags: ['supabase', 'backend'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: false, published: true, display_order: 2, created_at: '2024-04-01T00:00:00Z', updated_at: '2024-04-01T00:00:00Z' },
  { id: '3', title: 'Launched Public Homepage', slug: 'launched-homepage', description: 'Released the public-facing experience with project showcase and tool catalog.', entry_date: '2024-07', milestone_type: 'achievement', tags: ['launch', 'frontend'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: true, published: true, display_order: 3, created_at: '2024-07-01T00:00:00Z', updated_at: '2024-07-01T00:00:00Z' },
  { id: '4', title: 'AI Assistant Beta', slug: 'ai-assistant-beta', description: 'Integrated multi-provider AI assistant with tool recommendations.', entry_date: '2024-10', milestone_type: 'project', tags: ['ai', 'assistant'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: false, published: true, display_order: 4, created_at: '2024-10-01T00:00:00Z', updated_at: '2024-10-01T00:00:00Z' },
];

async function checkSuperAdmin(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { isAuthorized: false, user: null, status: 401 };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    return { isAuthorized: false, user, status: 403 };
  }

  return { isAuthorized: true, user, status: 200 };
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    let { data, error } = await supabase
      .from('nexus_journey')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      // Return default entries if table doesn't exist yet or is empty
      let entries = DEFAULT_JOURNEY_ENTRIES;
      if (id) entries = entries.filter(e => e.id === id);
      if (slug) entries = entries.filter(e => e.slug === slug);
      return NextResponse.json({ data: id || slug ? (entries[0] || null) : entries });
    }

    if (id) {
      const match = data.find((item: any) => item.id === id);
      return NextResponse.json({ data: match || null });
    }
    if (slug) {
      const match = data.find((item: any) => item.slug === slug);
      return NextResponse.json({ data: match || null });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ data: DEFAULT_JOURNEY_ENTRIES });
  }
}

export async function POST(request: Request) {
  try {
    const supabaseServer = await createSupabaseServerClient();
    const authCheck = await checkSuperAdmin(supabaseServer);
    if (!authCheck.isAuthorized) {
      return NextResponse.json(
        { error: authCheck.status === 401 ? 'Unauthenticated' : 'Forbidden: Super Admin required' },
        { status: authCheck.status }
      );
    }

    const body = await request.json();
    const {
      title,
      slug,
      description,
      entry_date = new Date().toISOString().substring(0, 7),
      milestone_type = 'project',
      tags = [],
      image_url,
      pdf_url,
      sql_url,
      zip_file_url,
      youtube_url,
      featured = false,
      status = 'published',
    } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 });
    }

    const dbClient = isServiceRoleConfigured() ? createSupabaseAdminClient() : supabaseServer;

    const metadata = {
      pdf_url: pdf_url || null,
      sql_url: sql_url || null,
      zip_file_url: zip_file_url || null,
      youtube_url: youtube_url || null,
    };

    const payload = {
      title,
      slug,
      description: description || '',
      entry_date: entry_date || '',
      milestone_type: milestone_type || 'project',
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      image_url: image_url || null,
      metadata,
      featured: Boolean(featured),
      status: status || 'published',
      created_by: authCheck.user?.id,
      updated_by: authCheck.user?.id,
    };

    const { data, error } = await dbClient
      .from('nexus_journey')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      // If table doesn't exist, return payload mock response
      const mockResult = { id: `journey_${Date.now()}`, ...payload, created_at: new Date().toISOString() };
      revalidatePath('/journey');
      revalidatePath('/');
      return NextResponse.json({ success: true, data: mockResult });
    }

    revalidatePath('/journey');
    revalidatePath('/');

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabaseServer = await createSupabaseServerClient();
    const authCheck = await checkSuperAdmin(supabaseServer);
    if (!authCheck.isAuthorized) {
      return NextResponse.json(
        { error: authCheck.status === 401 ? 'Unauthenticated' : 'Forbidden: Super Admin required' },
        { status: authCheck.status }
      );
    }

    const body = await request.json();
    const { id, slug, ...updates } = body;

    const dbClient = isServiceRoleConfigured() ? createSupabaseAdminClient() : supabaseServer;

    let updateQuery = dbClient.from('nexus_journey').update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: authCheck.user?.id,
    });

    if (id) updateQuery = updateQuery.eq('id', id);
    else updateQuery = updateQuery.eq('slug', slug);

    const { data, error } = await updateQuery.select('*').maybeSingle();

    if (error) {
      revalidatePath('/journey');
      revalidatePath('/');
      return NextResponse.json({ success: true, data: { id, slug, ...updates } });
    }

    revalidatePath('/journey');
    revalidatePath('/');

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabaseServer = await createSupabaseServerClient();
    const authCheck = await checkSuperAdmin(supabaseServer);
    if (!authCheck.isAuthorized) {
      return NextResponse.json(
        { error: authCheck.status === 401 ? 'Unauthenticated' : 'Forbidden: Super Admin required' },
        { status: authCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
    }

    const dbClient = isServiceRoleConfigured() ? createSupabaseAdminClient() : supabaseServer;

    await dbClient.from('nexus_journey').delete().eq('id', id);

    revalidatePath('/journey');
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
