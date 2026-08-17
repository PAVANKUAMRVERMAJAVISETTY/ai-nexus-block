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

const DEFAULT_KNOWLEDGE = [
  {
    id: 'know_1',
    title: 'Mastering Supabase Row Level Security (RLS) & Security Definer Functions',
    slug: 'mastering-supabase-rls-security-definer',
    excerpt: 'Comprehensive architecture guide for hardening multi-role database applications in PostgreSQL using auth.uid() and SECURITY DEFINER helpers.',
    content: 'Row Level Security (RLS) is PostgreSQL\'s native authorization model. By executing security policies directly inside the database kernel, unauthorized rows are stripped before reaching API layers. SECURITY DEFINER functions run with creator privileges, bypassing infinite recursion loops when inspecting user roles during query execution.',
    category: 'Supabase & RLS',
    tags: ['Supabase', 'PostgreSQL', 'RLS', 'Security', 'Database Design'],
    metadata: { reading_time_minutes: 8, is_pinned: true },
    featured: true,
    status: 'published',
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'know_2',
    title: 'Next.js 15 App Router: Data Cache Invalidation & Instant CMS Revalidation',
    slug: 'nextjs-15-app-router-data-cache-revalidation',
    excerpt: 'Deep dive into revalidatePath() and revalidateTag() patterns for instant CMS updates and server-side data synchronization.',
    content: 'Next.js App Router caches fetch requests and full route renders. When administrative updates occur, revalidatePath() programmatically purges specific cache keys. This ensures zero downtime and instant rendering of updated content across edge networks.',
    category: 'Next.js App Router',
    tags: ['Next.js', 'App Router', 'Caching', 'revalidatePath', 'React 19'],
    metadata: { reading_time_minutes: 6, is_pinned: true },
    featured: true,
    status: 'published',
    created_at: '2026-02-05T00:00:00Z',
  },
  {
    id: 'know_3',
    title: 'Production Algorithms: Haversine Geolocation & Zero-Dependency PKZip Encoding',
    slug: 'production-algorithms-haversine-pkzip-archiver',
    excerpt: 'Engineering custom mathematical & binary algorithms in TypeScript: great-circle spherical distance and Uint8Array ZIP archive generation.',
    content: 'Building production applications requires lightweight algorithmic engines. The Haversine formula calculates spherical distance between latitude/longitude pairs to route inquiries to micro-market territory agents. The PKZip archiver writes raw store-mode ZIP package headers and CRC-32 checksums directly in browser memory using Uint8Array.',
    category: 'Algorithms',
    tags: ['Haversine', 'PKZip', 'Algorithms', 'TypeScript', 'Binary Processing'],
    metadata: { reading_time_minutes: 10, is_pinned: true },
    featured: true,
    status: 'published',
    created_at: '2026-02-10T00:00:00Z',
  },
  {
    id: 'know_4',
    title: 'AI Agentic Engineering: Multi-Provider LLM Fallback Cascade & Copilot Context',
    slug: 'ai-agentic-engineering-llm-cascade-fallback',
    excerpt: 'Architecting resilient AI workflows with Cursor, Claude Code, Cline, and Roo Code using OpenRouter and Gemini API multi-LLM fallbacks.',
    content: 'Autonomous AI coding tools rely on precise context orchestration. By combining prompt engineering (.cursorrules, AGENTS.md) with an 11-provider AI cascade fallback mechanism, developers eliminate API downtime and achieve deterministic code generation.',
    category: 'AI Frameworks',
    tags: ['AI Workflows', 'Claude Code', 'Cursor', 'Cline', 'Roo Code', 'Gemini API'],
    metadata: { reading_time_minutes: 7, is_pinned: true },
    featured: true,
    status: 'published',
    created_at: '2026-02-15T00:00:00Z',
  },
];

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    let query = supabase.from('nexus_knowledge').select('*');

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

    const { data, error } = await (id || slug ? query.maybeSingle() : query.order('featured', { ascending: false }).order('title'));

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      if (id) {
        const item = DEFAULT_KNOWLEDGE.find((k) => k.id === id);
        return NextResponse.json({ data: item || null });
      }
      if (slug) {
        const item = DEFAULT_KNOWLEDGE.find((k) => k.slug === slug);
        return NextResponse.json({ data: item || null });
      }
      return NextResponse.json({ data: DEFAULT_KNOWLEDGE });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ data: DEFAULT_KNOWLEDGE });
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
      excerpt,
      content,
      category,
      tags = [],
      image_url,
      pdf_url,
      sql_url,
      zip_file_url,
      youtube_url,
      documentation_url,
      reading_time_minutes = 5,
      is_pinned = false,
      featured = false,
      status = 'published',
    } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 });
    }

    const dbClient = isServiceRoleConfigured() ? createSupabaseAdminClient() : supabaseServer;

    const metadata = {
      image_url: image_url || null,
      pdf_url: pdf_url || null,
      sql_url: sql_url || null,
      zip_file_url: zip_file_url || null,
      youtube_url: youtube_url || null,
      documentation_url: documentation_url || null,
      reading_time_minutes: Number(reading_time_minutes) || 5,
      is_pinned: Boolean(is_pinned),
    };

    const payload = {
      title,
      slug,
      excerpt: excerpt || '',
      content: content || '',
      category: category || 'Engineering',
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      metadata,
      featured: Boolean(featured),
      status: status || 'published',
      created_by: authCheck.user?.id,
      updated_by: authCheck.user?.id,
    };

    const { data, error } = await dbClient
      .from('nexus_knowledge')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidatePath('/knowledge');
    revalidatePath(`/knowledge/${slug}`);
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

    let existingQuery = dbClient.from('nexus_knowledge').select('*');
    if (id) existingQuery = existingQuery.eq('id', id);
    else existingQuery = existingQuery.eq('slug', slug);
    const { data: existing } = await existingQuery.maybeSingle();

    const currentMetadata = existing?.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...(updates.image_url !== undefined ? { image_url: updates.image_url } : {}),
      ...(updates.pdf_url !== undefined ? { pdf_url: updates.pdf_url } : {}),
      ...(updates.sql_url !== undefined ? { sql_url: updates.sql_url } : {}),
      ...(updates.zip_file_url !== undefined ? { zip_file_url: updates.zip_file_url } : {}),
      ...(updates.youtube_url !== undefined ? { youtube_url: updates.youtube_url } : {}),
      ...(updates.documentation_url !== undefined ? { documentation_url: updates.documentation_url } : {}),
      ...(updates.reading_time_minutes !== undefined ? { reading_time_minutes: Number(updates.reading_time_minutes) } : {}),
      ...(updates.is_pinned !== undefined ? { is_pinned: Boolean(updates.is_pinned) } : {}),
    };

    const payload: Record<string, any> = {
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
      updated_by: authCheck.user?.id,
    };

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.excerpt !== undefined) payload.excerpt = updates.excerpt;
    if (updates.content !== undefined) payload.content = updates.content;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.tags !== undefined) {
      payload.tags = Array.isArray(updates.tags) ? updates.tags : typeof updates.tags === 'string' ? updates.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
    }
    if (updates.featured !== undefined) payload.featured = Boolean(updates.featured);
    if (updates.status !== undefined) payload.status = updates.status;

    let updateQuery = dbClient.from('nexus_knowledge').update(payload);
    if (id) updateQuery = updateQuery.eq('id', id);
    else updateQuery = updateQuery.eq('slug', slug);

    const { data, error } = await updateQuery.select('*').single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidatePath('/knowledge');
    if (slug || data?.slug) revalidatePath(`/knowledge/${slug || data?.slug}`);
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

    const { error } = await dbClient.from('nexus_knowledge').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidatePath('/knowledge');
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
