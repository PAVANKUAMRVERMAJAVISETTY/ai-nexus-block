import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DEFAULT_PROJECTS = [
  {
    id: 'proj_1',
    title: 'AI Nexus Block',
    slug: 'ai-nexus-block',
    description: 'AI-Powered Developer Research & Engineering Platform featuring advanced AI-driven code analysis, instant bug resolution workflows, and secure PostgreSQL RLS architecture.',
    long_description: 'Official creator and research platform built using Next.js 15, TypeScript, Supabase RLS, and a multi-provider AI assistant. Offers developer tools directory, interactive architecture diagrams, engineering roadmaps, and instant AI copilot support.',
    project_type: 'Full Stack AI',
    tags: ['Next.js', 'TypeScript', 'Supabase RLS', 'Tailwind CSS', 'AI Assistant', 'Framer Motion'],
    repository_url: 'https://github.com/PAVANKUAMRVERMAJAVISETTY/ai-nexus-block',
    live_url: 'https://ai-nexus-block.vercel.app/',
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    featured: true,
    status: 'published',
    metadata: { is_case_study: true },
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'proj_2',
    title: 'Urban Properties',
    slug: 'urban-properties',
    description: 'Full-Stack Direct Owner Real Estate Platform & Lead Tracking featuring a 4-role RBAC hierarchy, Haversine geolocation area agent routing engine, unauthenticated lead capture gate, and zero-dependency PKZip binary archiver for bulk listing media downloads.',
    long_description: 'Production real-time property rentals and sales web platform built with React 19, TypeScript, TanStack Router/Start, Supabase Auth and PostgreSQL RLS. Features micro-market territory routing via the Haversine formula and native Uint8Array/CRC-32 PKZip binary encoding.',
    project_type: 'Supabase Systems',
    tags: ['React 19', 'TypeScript', 'TanStack Router/Start', 'Supabase RLS', 'TanStack Query', 'Vite', 'Tailwind CSS', 'PKZip Archiver', 'Haversine Geolocation'],
    repository_url: null,
    live_url: 'https://seedhaproperties.com/',
    image_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=800&auto=format&fit=crop',
    featured: true,
    status: 'published',
    metadata: { is_case_study: true },
    created_at: '2025-11-01T00:00:00Z',
    updated_at: '2025-11-01T00:00:00Z',
  },
  {
    id: 'proj_3',
    title: "Trippy's Mehfill",
    slug: 'trippys-mehfill',
    description: 'Intelligent Cloud-Kitchen ERP & Ordering Platform covering menu management, live order tracking, customer workflows, operational dashboards, and role-based access control with RLS policies.',
    long_description: 'Full-stack cloud-kitchen ERP delivering real-time kitchen transactional updates, multi-tenant order streams, role-based staff dashboards, and strict database privacy using React/Next.js, TypeScript, and Supabase PostgreSQL RLS.',
    project_type: 'Full Stack AI',
    tags: ['React', 'Next.js', 'TypeScript', 'Supabase', 'PostgreSQL', 'RLS', 'Tailwind CSS'],
    repository_url: null,
    live_url: 'https://trippysmehfill.vercel.app/',
    image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop',
    featured: true,
    status: 'published',
    metadata: { is_case_study: true },
    created_at: '2025-05-01T00:00:00Z',
    updated_at: '2025-05-01T00:00:00Z',
  },
  {
    id: 'proj_4',
    title: 'Shree Gopi Traders',
    slug: 'shree-gopi-traders',
    description: 'B2B Wholesale Salon & Beauty Supplies E-Commerce platform featuring quantity-based dynamic pricing, product variants, stock tracking, bulk-order inquiries, and WhatsApp support workflows.',
    long_description: 'High-performance wholesale B2B e-commerce platform built using Next.js, TypeScript, Tailwind CSS, and Supabase. Supports dynamic bulk discount tiers, inventory tracking, and integrated customer inquiry routing.',
    project_type: 'Frontend',
    tags: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Supabase', 'PostgreSQL', 'B2B E-Commerce'],
    repository_url: null,
    live_url: 'https://www.sreegopitraders.com/',
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop',
    featured: true,
    status: 'published',
    metadata: { is_case_study: false },
    created_at: '2025-02-01T00:00:00Z',
    updated_at: '2025-02-01T00:00:00Z',
  },
  {
    id: 'proj_5',
    title: 'Extru Tech',
    slug: 'extru-tech',
    description: 'Industry & Professional Network Platform connecting students, consultants, and manufacturers with career pathways, formulation inquiries, and integrated Razorpay online payment workflows.',
    long_description: 'Professional industrial network connecting engineering students, industrial consultants, and extrusion manufacturers. Integrates career paths, consultation bookings, and Razorpay API payment gateways.',
    project_type: 'Backend & API',
    tags: ['React', 'Next.js', 'Supabase', 'Razorpay API', 'TypeScript', 'Tailwind CSS'],
    repository_url: null,
    live_url: 'https://extru-tech.vercel.app/',
    image_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop',
    featured: true,
    status: 'published',
    metadata: { is_case_study: false },
    created_at: '2025-08-01T00:00:00Z',
    updated_at: '2025-08-01T00:00:00Z',
  },
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

    let query = supabase.from('nexus_projects').select('*');

    if (id) {
      query = query.eq('id', id);
    } else if (slug) {
      query = query.eq('slug', slug);
    }

    // Check if requester is super_admin to show drafts as well
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

    const { data, error } = await (id || slug ? query.maybeSingle() : query.order('featured', { ascending: false }).order('created_at', { ascending: false }));

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      if (id) {
        const item = DEFAULT_PROJECTS.find((p) => p.id === id);
        return NextResponse.json({ data: item || null });
      }
      if (slug) {
        const item = DEFAULT_PROJECTS.find((p) => p.slug === slug);
        return NextResponse.json({ data: item || null });
      }
      return NextResponse.json({ data: DEFAULT_PROJECTS });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ data: DEFAULT_PROJECTS });
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
      long_description,
      category,
      tags = [],
      live_url,
      github_url,
      zip_file_url,
      pdf_url,
      sql_url,
      youtube_url,
      image_url,
      is_case_study = false,
      featured = false,
      status = 'published',
    } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 });
    }

    const dbClient = isServiceRoleConfigured() ? createSupabaseAdminClient() : supabaseServer;

    const metadata = {
      is_case_study: Boolean(is_case_study),
      pdf_url: pdf_url || null,
      sql_url: sql_url || null,
      zip_file_url: zip_file_url || null,
      youtube_url: youtube_url || null,
    };

    const payload = {
      title,
      slug,
      description: description || '',
      long_description: long_description || null,
      project_type: category || 'AI Platform',
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      repository_url: github_url || null,
      live_url: live_url || null,
      image_url: image_url || null,
      featured: Boolean(featured),
      status: status || 'published',
      metadata,
      created_by: authCheck.user?.id,
      updated_by: authCheck.user?.id,
    };

    const { data, error } = await dbClient
      .from('nexus_projects')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${slug}`);
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
      return NextResponse.json({ error: 'ID or slug is required for updates' }, { status: 400 });
    }

    const dbClient = isServiceRoleConfigured() ? createSupabaseAdminClient() : supabaseServer;

    // Fetch existing record if metadata merging is needed
    let existingQuery = dbClient.from('nexus_projects').select('*');
    if (id) existingQuery = existingQuery.eq('id', id);
    else existingQuery = existingQuery.eq('slug', slug);
    const { data: existing } = await existingQuery.maybeSingle();

    const currentMetadata = existing?.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      ...(updates.is_case_study !== undefined ? { is_case_study: Boolean(updates.is_case_study) } : {}),
      ...(updates.pdf_url !== undefined ? { pdf_url: updates.pdf_url } : {}),
      ...(updates.sql_url !== undefined ? { sql_url: updates.sql_url } : {}),
      ...(updates.zip_file_url !== undefined ? { zip_file_url: updates.zip_file_url } : {}),
      ...(updates.youtube_url !== undefined ? { youtube_url: updates.youtube_url } : {}),
    };

    const payload: Record<string, any> = {
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
      updated_by: authCheck.user?.id,
    };

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.long_description !== undefined) payload.long_description = updates.long_description;
    if (updates.category !== undefined) payload.project_type = updates.category;
    if (updates.tags !== undefined) {
      payload.tags = Array.isArray(updates.tags) ? updates.tags : typeof updates.tags === 'string' ? updates.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
    }
    if (updates.github_url !== undefined) payload.repository_url = updates.github_url;
    if (updates.live_url !== undefined) payload.live_url = updates.live_url;
    if (updates.image_url !== undefined) payload.image_url = updates.image_url;
    if (updates.featured !== undefined) payload.featured = Boolean(updates.featured);
    if (updates.status !== undefined) payload.status = updates.status;

    let updateQuery = dbClient.from('nexus_projects').update(payload);
    if (id) updateQuery = updateQuery.eq('id', id);
    else updateQuery = updateQuery.eq('slug', slug);

    const { data, error } = await updateQuery.select('*').single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidatePath('/projects');
    if (slug || data?.slug) revalidatePath(`/projects/${slug || data?.slug}`);
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

    const { error } = await dbClient.from('nexus_projects').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidatePath('/projects');
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
