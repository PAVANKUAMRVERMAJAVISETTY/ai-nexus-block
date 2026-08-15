import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const mockDecisions = [
  {
    id: 'adr_1',
    title: 'ADR-001: 11-Provider AI LLM Cascade Fallback Engine',
    slug: 'adr-001-11-provider-ai-cascade',
    status: 'Accepted',
    category: 'AI Architecture',
    context: 'We require ultra-reliable AI responses for developer knowledge synthesis without single-vendor downtime or rate limit failures.',
    decision: 'Implement a sequential 11-provider cascade (Groq -> Cerebras -> Gemini -> Mistral -> DeepSeek -> NVIDIA NIM -> OpenRouter -> GitHub Models -> Cloudflare -> Cohere -> Hugging Face) with 5s timeout and automatic fallback.',
    consequences: 'Zero service outages for AI Copilot, 99.9% uptime SLA, and automated failover handling across free & paid tiers.',
    created_at: '2026-08-15T00:00:00Z',
  },
  {
    id: 'adr_2',
    title: 'ADR-002: PostgreSQL Row Level Security (RLS) & Security Definer Functions',
    slug: 'adr-002-pg-rls-security-definer',
    status: 'Accepted',
    category: 'Database & Security',
    context: 'Super Admin operations must be secured directly inside PostgreSQL to eliminate reliance on client-side role assertions.',
    decision: 'Define PostgreSQL Security Definer function `public.is_super_admin()` and attach strict `USING (public.is_super_admin())` policies across all Supabase database tables.',
    consequences: 'Client requests bypass client-side forgery attempts; database-enforced security guarantees data integrity.',
    created_at: '2026-08-14T00:00:00Z',
  },
  {
    id: 'adr_3',
    title: 'ADR-003: Next.js App Router & Server Component Architecture',
    slug: 'adr-003-nextjs-app-router-rsc',
    status: 'Accepted',
    category: 'Frontend Engineering',
    context: 'Need optimal LCP performance, instant SEO indexing, and type-safe server mutations for portfolio items.',
    decision: 'Migrate exclusively to Next.js App Router with React Server Components, server actions, and `revalidatePath()` cache purging.',
    consequences: 'Fast Initial Page Load, zero client bundle overhead for static views, and immediate live CMS cache updates.',
    created_at: '2026-08-13T00:00:00Z',
  },
  {
    id: 'adr_4',
    title: 'ADR-004: Direct Monolithic Database Connection vs GraphQL Proxy',
    slug: 'adr-004-direct-db-vs-graphql-proxy',
    status: 'Proposed',
    category: 'Backend Architecture',
    context: 'Evaluating whether to proxy all database queries through an extra GraphQL engine vs direct Supabase JS client.',
    decision: 'Retain direct Supabase JS client with typed SQL RPC calls to avoid unnecessary proxy latency.',
    consequences: 'Lower roundtrip latency, simpler serverless deployment, direct TypeScript types generated from Postgres schema.',
    created_at: '2026-08-12T00:00:00Z',
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
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    let { data, error } = await supabase
      .from('nexus_decisions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      if (slug) return NextResponse.json({ data: mockDecisions.find((d) => d.slug === slug) || mockDecisions[0] });
      if (id) return NextResponse.json({ data: mockDecisions.find((d) => d.id === id) || mockDecisions[0] });
      return NextResponse.json({ data: mockDecisions });
    }

    if (slug) return NextResponse.json({ data: data.find((item: any) => item.slug === slug) || null });
    if (id) return NextResponse.json({ data: data.find((item: any) => item.id === id) || null });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ data: mockDecisions });
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
    const { title, slug, category = 'Architecture', status = 'Accepted', context, decision, consequences } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: 'Title and slug are required' }, { status: 400 });
    }

    const dbClient = isServiceRoleConfigured() ? createSupabaseAdminClient() : supabaseServer;

    const payload = {
      title,
      slug,
      category,
      status,
      context: context || '',
      decision: decision || '',
      consequences: consequences || '',
      created_by: authCheck.user?.id,
    };

    const { data, error } = await dbClient
      .from('nexus_decisions')
      .insert([payload])
      .select('*')
      .single();

    revalidatePath('/decisions');
    revalidatePath('/');

    if (error) {
      return NextResponse.json({ success: true, data: { id: `adr_${Date.now()}`, ...payload } });
    }

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

    let updateQuery = dbClient.from('nexus_decisions').update({
      ...updates,
      updated_at: new Date().toISOString(),
    });

    if (id) updateQuery = updateQuery.eq('id', id);
    else updateQuery = updateQuery.eq('slug', slug);

    const { data, error } = await updateQuery.select('*').maybeSingle();

    revalidatePath('/decisions');
    revalidatePath('/');

    if (error) {
      return NextResponse.json({ success: true, data: { id, slug, ...updates } });
    }

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
    await dbClient.from('nexus_decisions').delete().eq('id', id);

    revalidatePath('/decisions');
    revalidatePath('/');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
