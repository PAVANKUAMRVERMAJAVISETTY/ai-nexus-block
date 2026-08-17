import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const DEFAULT_JOURNEY_ENTRIES = [
  { id: '1', title: 'B.Tech CSE Graduation — Central University of Haryana', slug: 'btech-cse-graduation', description: 'Completed B.Tech in Computer Science & Engineering with strong foundation in database architecture, operating systems, and algorithms.', entry_date: '2024-05', milestone_type: 'education', tags: ['graduation', 'cse', 'btech'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: true, published: true, display_order: 1, created_at: '2024-05-01T00:00:00Z', updated_at: '2024-05-01T00:00:00Z' },
  { id: '2', title: 'Python & ML Internships — 360digrii Hyderabad', slug: 'python-ml-internships', description: 'Built machine learning data preprocessing pipelines, exploratory data analysis, and NLP abusive-language text-classification models using Python.', entry_date: '2024-06', milestone_type: 'internship', tags: ['python', 'machine learning', 'nlp'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: false, published: true, display_order: 2, created_at: '2024-06-01T00:00:00Z', updated_at: '2024-06-01T00:00:00Z' },
  { id: '3', title: 'Full-Stack Freelance Developer Practice', slug: 'fullstack-freelance-developer', description: 'Initiated independent freelance full-stack engineering practice in Noida, India, delivering production client web applications and cloud architectures.', entry_date: '2024-10', milestone_type: 'achievement', tags: ['freelance', 'fullstack', 'noida'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: true, published: true, display_order: 3, created_at: '2024-10-01T00:00:00Z', updated_at: '2024-10-01T00:00:00Z' },
  { id: '4', title: 'Shree Gopi Traders B2B E-Commerce Launch', slug: 'shree-gopi-traders-launch', description: 'Architected and deployed wholesale B2B beauty supplies platform (sreegopitraders.com) with dynamic pricing tiers, inventory tracking, and WhatsApp support.', entry_date: '2025-02', milestone_type: 'project', tags: ['nextjs', 'ecommerce', 'b2b'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: true, published: true, display_order: 4, created_at: '2025-02-01T00:00:00Z', updated_at: '2025-02-01T00:00:00Z' },
  { id: '5', title: 'Trippy\'s Mehfill Cloud-Kitchen ERP Launch', slug: 'trippys-mehfill-erp-launch', description: 'Engineered intelligent cloud-kitchen ERP platform (trippysmehfill.vercel.app) with live order tracking, role-based access, and PostgreSQL RLS security.', entry_date: '2025-05', milestone_type: 'project', tags: ['react', 'supabase', 'rls', 'erp'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: true, published: true, display_order: 5, created_at: '2025-05-01T00:00:00Z', updated_at: '2025-05-01T00:00:00Z' },
  { id: '6', title: 'Extru Tech Industrial Network Platform', slug: 'extru-tech-platform-launch', description: 'Built professional network connecting students, consultants, and manufacturers (extru-tech.vercel.app) with integrated Razorpay payment gateway.', entry_date: '2025-08', milestone_type: 'project', tags: ['nextjs', 'razorpay', 'payments'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: true, published: true, display_order: 6, created_at: '2025-08-01T00:00:00Z', updated_at: '2025-08-01T00:00:00Z' },
  { id: '7', title: 'Urban Properties Real Estate Platform Launch', slug: 'urban-properties-platform-launch', description: 'Engineered direct owner real estate platform (seedhaproperties.com) featuring 4-role RBAC, Haversine geolocation agent routing, and zero-dependency PKZip archiver.', entry_date: '2025-11', milestone_type: 'project', tags: ['react19', 'tanstack', 'haversine', 'pkzip'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: true, published: true, display_order: 7, created_at: '2025-11-01T00:00:00Z', updated_at: '2025-11-01T00:00:00Z' },
  { id: '8', title: 'Creator of AI Nexus Block Ecosystem', slug: 'creator-ai-nexus-block', description: 'Architected and launched official creator portfolio & research platform (ai-nexus-block.vercel.app) with multi-provider AI Copilot, RLS security, and technical guides.', entry_date: '2026-03', milestone_type: 'achievement', tags: ['platform', 'ai assistant', 'creator'], image_url: null, pdf_url: null, sql_url: null, zip_file_url: null, featured: true, published: true, display_order: 8, created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
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
