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

const DEFAULT_TOOLS = [
  {
    id: 'tool-001',
    name: 'OpenClaw',
    slug: 'openclaw',
    tagline: 'Personal AI Agent that lives on your local device.',
    description: 'Autonomous local AI agent framework designed to execute system-level workflows, run local automation, and maintain complete user privacy.',
    category: 'AI Agent Frameworks',
    website_url: 'https://openclaw.ai',
    documentation_url: 'https://github.com/openclaw/openclaw',
    pricing: { value: 'Free', details: 'Open Source' },
    tags: ['AI Agent', 'Local AI', 'Automation', 'Privacy'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/openclaw/openclaw' }
  },
  {
    id: 'tool-002',
    name: 'n8n',
    slug: 'n8n',
    tagline: 'Visual workflow automation platform with native AI capabilities.',
    description: 'Fair-code workflow automation tool with extensive AI node integrations for building autonomous agents, webhook triggers, and multi-service data pipelines.',
    category: 'Workflow Automation',
    website_url: 'https://n8n.io',
    documentation_url: 'https://docs.n8n.io',
    pricing: { value: 'Freemium', details: 'Self-Hosted Free / Cloud Paid' },
    tags: ['Workflow', 'Automation', 'Visual Builder', 'AI Agents'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/n8n-io/n8n' }
  },
  {
    id: 'tool-003',
    name: 'Ollama',
    slug: 'ollama',
    tagline: 'Run powerful open-weight LLMs locally on your hardware.',
    description: 'Get up and running with Llama 3, DeepSeek-V3, Mistral, and Gemma locally with GPU-accelerated inference and clean CLI/REST APIs.',
    category: 'Local LLMs',
    website_url: 'https://ollama.com',
    documentation_url: 'https://github.com/ollama/ollama',
    pricing: { value: 'Free', details: 'Open Source' },
    tags: ['LLMs', 'Local AI', 'Inference', 'Open Source'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/ollama/ollama' }
  },
  {
    id: 'tool-004',
    name: 'Langflow',
    slug: 'langflow',
    tagline: 'A drag-and-drop visual builder for deploying AI agents.',
    description: 'UI-first developer workspace for prototyping, building, and deploying multi-agent systems, RAG pipelines, and LLM flows with Python/TypeScript export.',
    category: 'Visual Agent Builder',
    website_url: 'https://www.langflow.org',
    documentation_url: 'https://docs.langflow.org',
    pricing: { value: 'Free', details: 'Open Source' },
    tags: ['Visual Builder', 'AI Agents', 'LangChain', 'RAG'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/langflow-ai/langflow' }
  },
  {
    id: 'tool-005',
    name: 'Dify',
    slug: 'dify',
    tagline: 'A full-stack, production-ready platform for building AI apps.',
    description: 'All-in-one LLM application development platform combining prompt orchestration, RAG engine, agentic workflows, and backend API generation.',
    category: 'AI Application Platform',
    website_url: 'https://dify.ai',
    documentation_url: 'https://docs.dify.ai',
    pricing: { value: 'Freemium', details: 'Open Source / Cloud Hosted' },
    tags: ['Full Stack AI', 'RAG', 'Agent Workflows', 'LLM Apps'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/langgenius/dify' }
  },
  {
    id: 'tool-006',
    name: 'LangChain',
    slug: 'langchain',
    tagline: 'Foundational framework powering the AI agent ecosystem.',
    description: 'Industry-standard Python and JavaScript framework for building context-aware reasoning applications, memory stores, tool-calling agents, and vector search.',
    category: 'AI Frameworks',
    website_url: 'https://www.langchain.com',
    documentation_url: 'https://python.langchain.com',
    pricing: { value: 'Free', details: 'Open Source' },
    tags: ['Framework', 'Agentic AI', 'Tool Calling', 'Python', 'JS'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/langchain-ai/langchain' }
  },
  {
    id: 'tool-007',
    name: 'Open WebUI',
    slug: 'open-webui',
    tagline: 'Self-hosted, offline-capable ChatGPT alternative.',
    description: 'Feature-rich web interface for Ollama and OpenAI-compatible APIs supporting Web Search, RAG document ingestion, multi-model chat, and user access controls.',
    category: 'Local AI UI',
    website_url: 'https://openwebui.com',
    documentation_url: 'https://docs.openwebui.com',
    pricing: { value: 'Free', details: 'Open Source' },
    tags: ['UI', 'Ollama Interface', 'RAG', 'Self Hosted'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/open-webui/open-webui' }
  },
  {
    id: 'tool-008',
    name: 'DeepSeek-V3',
    slug: 'deepseek-v3',
    tagline: 'State-of-the-art open-weight Mixture-of-Experts LLM.',
    description: 'Ultra-efficient 671B parameter Mixture-of-Experts open-weight LLM delivering frontier reasoning, code synthesis, and mathematical problem-solving performance.',
    category: 'LLMs & Foundation Models',
    website_url: 'https://www.deepseek.com',
    documentation_url: 'https://github.com/deepseek-ai/DeepSeek-V3',
    pricing: { value: 'Free', details: 'Open Weights' },
    tags: ['MoE', 'Open Weight', 'Reasoning', 'Code AI'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/deepseek-ai/DeepSeek-V3' }
  },
  {
    id: 'tool-009',
    name: 'Gemini CLI',
    slug: 'gemini-cli',
    tagline: "Google's open-source tool to interact with Gemini models directly from terminal.",
    description: 'Command-line tool and SDK for streaming Gemini 1.5 Pro/Flash responses, running shell commands, inspecting codebases, and executing multimodal prompts.',
    category: 'Developer CLI',
    website_url: 'https://ai.google.dev',
    documentation_url: 'https://github.com/google-gemini/gemini-cli',
    pricing: { value: 'Free', details: 'Open Source API SDK' },
    tags: ['Gemini', 'CLI', 'Google AI', 'Developer Tools'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/google-gemini/gemini-cli' }
  },
  {
    id: 'tool-010',
    name: 'RAGFlow',
    slug: 'ragflow',
    tagline: 'Enterprise-grade deep document understanding RAG engine.',
    description: 'Open-source RAG engine based on deep document understanding, featuring automatic layout extraction, chunking, and multi-format file parser pipelines.',
    category: 'RAG Systems',
    website_url: 'https://ragflow.io',
    documentation_url: 'https://ragflow.io/docs/dev/',
    pricing: { value: 'Free', details: 'Open Source' },
    tags: ['RAG', 'Vector Search', 'Enterprise', 'Document AI'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/infiniflow/ragflow' }
  },
  {
    id: 'tool-011',
    name: 'Claude Code',
    slug: 'claude-code',
    tagline: 'Agentic coding tool that understands your entire codebase.',
    description: 'Terminal-based autonomous AI developer tool by Anthropic that reads whole repositories, executes git commands, edits files, and runs automated tests directly.',
    category: 'Agentic Coding',
    website_url: 'https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview',
    documentation_url: 'https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview',
    pricing: { value: 'Paid', details: 'API Usage Based' },
    tags: ['Claude 3.5 Sonnet', 'Autonomous Agent', 'Code Editor', 'Anthropic'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: false, github_url: 'https://github.com/anthropics' }
  },
  {
    id: 'tool-012',
    name: 'CrewAI',
    slug: 'crewai',
    tagline: 'Lightweight library to assemble a team of autonomous AI agents.',
    description: 'Production framework for orchestrating role-based autonomous AI agents that collaborate, delegate tasks, execute tool calls, and solve complex objectives.',
    category: 'Multi-Agent Frameworks',
    website_url: 'https://www.crewai.com',
    documentation_url: 'https://docs.crewai.com',
    pricing: { value: 'Free', details: 'Open Source' },
    tags: ['Multi Agent', 'CrewAI', 'Orchestration', 'Python'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/crewAIInc/crewAI' }
  },
  {
    id: 'tool-013',
    name: 'Cursor',
    slug: 'cursor',
    tagline: 'AI-first code editor for pair programming with AI.',
    description: 'VS Code fork built specifically for rapid AI pair programming, codebase indexing, smart edits, inline diff generation, and multi-file code editing.',
    category: 'AI Code Editors',
    website_url: 'https://cursor.com',
    documentation_url: 'https://docs.cursor.com',
    pricing: { value: 'Freemium', details: 'Free Tier / Pro Subscription' },
    tags: ['AI Editor', 'IDE', 'Pair Programming', 'Productivity'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: false, github_url: 'https://github.com/getcursor/cursor' }
  },
  {
    id: 'tool-014',
    name: 'Vercel',
    slug: 'vercel',
    tagline: 'Frontend cloud platform for deploying and scaling web apps.',
    description: 'Automated global edge network for Next.js, React, and serverless API execution with instant git deployments and serverless functions.',
    category: 'Cloud & Deployment',
    website_url: 'https://vercel.com',
    documentation_url: 'https://vercel.com/docs',
    pricing: { value: 'Freemium', details: 'Free Hobby / Pro Plan' },
    tags: ['Deployment', 'Hosting', 'Next.js', 'Edge Network'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: false, github_url: 'https://github.com/vercel' }
  },
  {
    id: 'tool-015',
    name: 'Supabase',
    slug: 'supabase',
    tagline: 'Open Source Firebase Alternative with PostgreSQL and RLS.',
    description: 'PostgreSQL database with Row Level Security (RLS), auto-generated REST/GraphQL APIs, Realtime subscriptions, Auth, and Storage buckets.',
    category: 'Databases & Backend',
    website_url: 'https://supabase.com',
    documentation_url: 'https://supabase.com/docs',
    pricing: { value: 'Freemium', details: 'Free Tier / Pro Tier' },
    tags: ['PostgreSQL', 'RLS Security', 'Auth', 'Realtime', 'Storage'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/supabase/supabase' }
  },
  {
    id: 'tool-016',
    name: 'Docker',
    slug: 'docker',
    tagline: 'Accelerate how you build, share, and run applications.',
    description: 'Containerization technology for packaging full-stack web applications, microservices, database containers, and autonomous agent runtime environments.',
    category: 'DevOps & Containers',
    website_url: 'https://www.docker.com',
    documentation_url: 'https://docs.docker.com',
    pricing: { value: 'Freemium', details: 'Community Free / Business' },
    tags: ['Containers', 'DevOps', 'Deployment', 'Microservices'],
    featured: true,
    status: 'published',
    metadata: { is_open_source: true, github_url: 'https://github.com/docker' }
  }
];

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    if (id || slug) {
      const match = DEFAULT_TOOLS.find((t) => t.id === id || t.slug === slug);
      if (match) {
        return NextResponse.json({ data: match });
      }
    }

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

    const { data } = await (id || slug ? query.maybeSingle() : query.order('featured', { ascending: false }).order('name'));

    if (!data || (Array.isArray(data) && data.length === 0)) {
      if (id || slug) {
        const found = DEFAULT_TOOLS.find((t) => t.id === id || t.slug === slug);
        return NextResponse.json({ data: found || null });
      }
      return NextResponse.json({ data: DEFAULT_TOOLS });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ data: DEFAULT_TOOLS });
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
