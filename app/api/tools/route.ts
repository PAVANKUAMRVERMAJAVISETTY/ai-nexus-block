import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

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

    let query = supabase.from('nexus_tools').select('*');

    if (id) {
      query = query.eq('id', id);
    } else if (slug) {
      query = query.eq('slug', slug);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    let isSuperAdmin = false;
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile?.role === 'super_admin') isSuperAdmin = true;
    }

    if (!isSuperAdmin) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await (id || slug ? query.maybeSingle() : query.order('featured', { ascending: false }).order('name'));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || (id || slug ? null : []) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
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
      name,
      slug,
      description,
      tagline,
      category,
      pricing = 'free',
      pricing_details,
      tags = [],
      website_url,
      github_url,
      documentation_url,
      youtube_url,
      pdf_url,
      sql_url,
      zip_file_url,
      image_url,
      logo_url,
      is_open_source = false,
      featured = false,
      status = 'published',
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
    }

    const dbClient = isServiceRoleConfigured() ? createSupabaseAdminClient() : supabaseServer;

    const pricingObj = typeof pricing === 'object' ? pricing : { value: pricing, details: pricing_details || null };
    const metadata = {
      is_open_source: Boolean(is_open_source),
      github_url: github_url || null,
      youtube_url: youtube_url || null,
      pdf_url: pdf_url || null,
      sql_url: sql_url || null,
      zip_file_url: zip_file_url || null,
    };

    const payload = {
      name,
      slug,
      tagline: tagline || description || '',
      description: description || '',
      category: category || 'Developer Tool',
      website_url: website_url || null,
      documentation_url: documentation_url || null,
      image_url: image_url || null,
      logo_url: logo_url || null,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      pricing: pricingObj,
      metadata,
      featured: Boolean(featured),
      status: status || 'published',
      created_by: authCheck.user?.id,
      updated_by: authCheck.user?.id,
    };

    const { data, error } = await dbClient
      .from('nexus_tools')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidatePath('/tools');
    revalidatePath(`/tools/${slug}`);
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

    if (!id && !slug) {
      return NextResponse.json({ error: 'ID or slug is required' }, { status: 400 });
    }

    const dbClient = isServiceRoleConfigured() ? createSupabaseAdminClient() : supabaseServer;

    let existingQuery = dbClient.from('nexus_tools').select('*');
    if (id) existingQuery = existingQuery.eq('id', id);
    else existingQuery = existingQuery.eq('slug', slug);
    const { data: existing } = await existingQuery.maybeSingle();

    const currentMetadata = existing?.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...(updates.is_open_source !== undefined ? { is_open_source: Boolean(updates.is_open_source) } : {}),
      ...(updates.github_url !== undefined ? { github_url: updates.github_url } : {}),
      ...(updates.youtube_url !== undefined ? { youtube_url: updates.youtube_url } : {}),
      ...(updates.pdf_url !== undefined ? { pdf_url: updates.pdf_url } : {}),
      ...(updates.sql_url !== undefined ? { sql_url: updates.sql_url } : {}),
      ...(updates.zip_file_url !== undefined ? { zip_file_url: updates.zip_file_url } : {}),
    };

    const payload: Record<string, any> = {
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
      updated_by: authCheck.user?.id,
    };

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.description !== undefined) {
      payload.description = updates.description;
      payload.tagline = updates.description;
    }
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.website_url !== undefined) payload.website_url = updates.website_url;
    if (updates.documentation_url !== undefined) payload.documentation_url = updates.documentation_url;
    if (updates.image_url !== undefined) payload.image_url = updates.image_url;
    if (updates.logo_url !== undefined) payload.logo_url = updates.logo_url;
    if (updates.pricing !== undefined) {
      payload.pricing = typeof updates.pricing === 'object' ? updates.pricing : { value: updates.pricing, details: updates.pricing_details || null };
    }
    if (updates.tags !== undefined) {
      payload.tags = Array.isArray(updates.tags) ? updates.tags : typeof updates.tags === 'string' ? updates.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
    }
    if (updates.featured !== undefined) payload.featured = Boolean(updates.featured);
    if (updates.status !== undefined) payload.status = updates.status;

    let updateQuery = dbClient.from('nexus_tools').update(payload);
    if (id) updateQuery = updateQuery.eq('id', id);
    else updateQuery = updateQuery.eq('slug', slug);

    const { data, error } = await updateQuery.select('*').single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidatePath('/tools');
    if (slug || data?.slug) revalidatePath(`/tools/${slug || data?.slug}`);
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

    const { error } = await dbClient.from('nexus_tools').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidatePath('/tools');
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
