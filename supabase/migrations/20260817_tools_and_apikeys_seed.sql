-- ====================================================================
-- SUPABASE MIGRATION: SEED 18+ AI TOOLS & AGENTIC STACK
-- Project: AI Nexus Block (https://ai-nexus-block.vercel.app/)
-- Creator: Naga Pavan Kumar Javisetty
-- ====================================================================

-- 1. Ensure Table Structure for nexus_tools
CREATE TABLE IF NOT EXISTS public.nexus_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    tagline TEXT,
    description TEXT,
    category TEXT,
    website_url TEXT,
    documentation_url TEXT,
    image_url TEXT,
    logo_url TEXT,
    tags TEXT[] DEFAULT '{}',
    pricing JSONB DEFAULT '{"value": "Free"}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    featured BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.nexus_tools ENABLE ROW LEVEL SECURITY;

-- Allow Public Read Access
DROP POLICY IF EXISTS "nexus_tools_public_read" ON public.nexus_tools;
CREATE POLICY "nexus_tools_public_read" ON public.nexus_tools FOR SELECT USING (true);

-- Allow Admin Write Access
DROP POLICY IF EXISTS "nexus_tools_admin_write" ON public.nexus_tools;
CREATE POLICY "nexus_tools_admin_write" ON public.nexus_tools FOR ALL TO authenticated USING (public.is_super_admin());

-- 2. Seed All 18+ Top AI GitHub Repositories & Agent Ecosystem Tools
INSERT INTO public.nexus_tools (
    name, slug, tagline, description, category, website_url, documentation_url, tags, pricing, metadata, featured, status
) VALUES
(
    'OpenClaw', 'openclaw',
    'Personal AI Agent that lives on your local device.',
    'Autonomous local AI agent framework designed to execute system-level workflows, run local automation, and maintain complete user privacy.',
    'AI Agent Frameworks', 'https://openclaw.ai', 'https://github.com/openclaw/openclaw',
    ARRAY['AI Agent', 'Local AI', 'Automation', 'Privacy'],
    '{"value": "Free", "details": "Open Source"}'::jsonb,
    '{"is_open_source": true, "github_url": "https://github.com/openclaw/openclaw"}'::jsonb,
    TRUE, 'published'
),
(
    'n8n', 'n8n',
    'Visual workflow automation platform with native AI capabilities.',
    'Fair-code workflow automation tool with extensive AI node integrations for building autonomous agents, webhook triggers, and multi-service data pipelines.',
    'Workflow Automation', 'https://n8n.io', 'https://docs.n8n.io',
    ARRAY['Workflow', 'Automation', 'Visual Builder', 'AI Agents'],
    '{"value": "Freemium", "details": "Self-Hosted Free / Cloud Paid"}'::jsonb,
    '{"is_open_source": true, "github_url": "https://github.com/n8n-io/n8n"}'::jsonb,
    TRUE, 'published'
),
(
    'Ollama', 'ollama',
    'Run powerful open-weight LLMs locally on your hardware.',
    'Get up and running with Llama 3, DeepSeek-V3, Mistral, and Gemma locally with GPU-accelerated inference and clean CLI/REST APIs.',
    'Local LLMs', 'https://ollama.com', 'https://github.com/ollama/ollama',
    ARRAY['LLMs', 'Local AI', 'Inference', 'Open Source'],
    '{"value": "Free", "details": "Open Source"}'::jsonb,
    '{"is_open_source": true, "github_url": "https://github.com/ollama/ollama"}'::jsonb,
    TRUE, 'published'
),
(
    'Langflow', 'langflow',
    'A drag-and-drop visual builder for deploying AI agents.',
    'UI-first developer workspace for prototyping, building, and deploying multi-agent systems, RAG pipelines, and LLM flows with Python/TypeScript export.',
    'Visual Agent Builder', 'https://www.langflow.org', 'https://docs.langflow.org',
    ARRAY['Visual Builder', 'AI Agents', 'LangChain', 'RAG'],
    '{"value": "Free", "details": "Open Source"}'::jsonb,
    '{"is_open_source": true, "github_url": "https://github.com/langflow-ai/langflow"}'::jsonb,
    TRUE, 'published'
),
(
    'Dify', 'dify',
    'A full-stack, production-ready platform for building AI apps.',
    'All-in-one LLM application development platform combining prompt orchestration, RAG engine, agentic workflows, and backend API generation.',
    'AI Application Platform', 'https://dify.ai', 'https://docs.dify.ai',
    ARRAY['Full Stack AI', 'RAG', 'Agent Workflows', 'LLM Apps'],
    '{"value": "Freemium", "details": "Open Source / Cloud Hosted"}'::jsonb,
    '{"is_open_source": true, "github_url": "https://github.com/langgenius/dify"}'::jsonb,
    TRUE, 'published'
),
(
    'LangChain', 'langchain',
    'Foundational framework powering the AI agent ecosystem.',
    'Industry-standard Python and JavaScript framework for building context-aware reasoning applications, memory stores, tool-calling agents, and vector search.',
    'AI Frameworks', 'https://www.langchain.com', 'https://python.langchain.com',
    ARRAY['Framework', 'Agentic AI', 'Tool Calling', 'Python', 'JS'],
    '{"value": "Free", "details": "Open Source"}'::jsonb,
    '{"is_open_source": true, "github_url": "https://github.com/langchain-ai/langchain"}'::jsonb,
    TRUE, 'published'
),
(
    'Open WebUI', 'open-webui',
    'Self-hosted, offline-capable ChatGPT alternative.',
    'Feature-rich web interface for Ollama and OpenAI-compatible APIs supporting Web Search, RAG document ingestion, multi-model chat, and user access controls.',
    'Local AI UI', 'https://openwebui.com', 'https://docs.openwebui.com',
    ARRAY['UI', 'Ollama Interface', 'RAG', 'Self Hosted'],
    '{"value": "Free", "details": "Open Source"}'::jsonb,
    '{"is_open_source": true, "github_url": "https://github.com/open-webui/open-webui"}'::jsonb,
    TRUE, 'published'
),
(
    'DeepSeek-V3', 'deepseek-v3',
    'State-of-the-art open-weight Mixture-of-Experts LLM.',
    'Ultra-efficient 671B parameter Mixture-of-Experts open-weight LLM delivering frontier reasoning, code synthesis, and mathematical problem-solving performance.',
    'LLMs & Foundation Models', 'https://www.deepseek.com', 'https://github.com/deepseek-ai/DeepSeek-V3',
    ARRAY['MoE', 'Open Weight', 'Reasoning', 'Code AI'],
    '{"value": "Free", "details": "Open Weights"}'::jsonb,
    '{"is_open_source": true, "github_url": "https://github.com/deepseek-ai/DeepSeek-V3"}'::jsonb,
    TRUE, 'published'
),
(
    'Gemini CLI', 'gemini-cli',
    'Google''s open-source tool to interact with Gemini models directly from terminal.',
    'Command-line tool and SDK for streaming Gemini 1.5 Pro/Flash responses, running shell commands, inspecting codebases, and executing multimodal prompts.',
    'Developer CLI', 'https://ai.google.dev', 'https://github.com/google-gemini/gemini-cli',
    ARRAY['Gemini', 'CLI', 'Google AI', 'Developer Tools'],
    '{"value": "Free", "details": "Open Source API SDK"}'::jsonb,
    '{"is_open_source": true, "github_url": "https://github.com/google-gemini/gemini-cli"}'::jsonb,
    TRUE, 'published'
),
(
    'RAGFlow', 'ragflow',
    'Enterprise-grade deep document understanding RAG engine.',
    'Open-source RAG engine based on deep document understanding, featuring automatic layout extraction, chunking, and multi-format file parser pipelines.',
    'RAG Systems', 'https://ragflow.io', 'https://ragflow.io/docs/dev/',
    ARRAY['RAG', 'Vector Search', 'Enterprise', 'Document AI'],
    '{"value": "Free", "details": "Open Source"}'::jsonb,
    '{"is_open_source": true, "github_url": "https://github.com/infiniflow/ragflow"}'::jsonb,
    TRUE, 'published'
),
(
    'Claude Code', 'claude-code',
    'Agentic coding tool that understands your entire codebase.',
    'Terminal-based autonomous AI developer tool by Anthropic that reads whole repositories, executes git commands, edits files, and runs automated tests directly.',
    'Agentic Coding', 'https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview', 'https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview',
    ARRAY['Claude 3.5 Sonnet', 'Autonomous Agent', 'Code Editor', 'Anthropic'],
    '{"value": "Paid", "details": "API Usage Based"}'::jsonb,
    '{"is_open_source": false, "github_url": "https://github.com/anthropics"}'::jsonb,
    TRUE, 'published'
),
(
    'CrewAI', 'crewai',
    'Lightweight library to assemble a team of autonomous AI agents.',
    'Production framework for orchestrating role-based autonomous AI agents that collaborate, delegate tasks, execute tool calls, and solve complex objectives.',
    'Multi-Agent Frameworks', 'https://www.crewai.com', 'https://docs.crewai.com',
    ARRAY['Multi Agent', 'CrewAI', 'Orchestration', 'Python'],
    '{"value": "Free", "details": "Open Source"}'::jsonb,
    '{"is_open_source": true, "github_url": "https://github.com/crewAIInc/crewAI"}'::jsonb,
    TRUE, 'published'
)
ON CONFLICT (slug) DO UPDATE SET
    description = EXCLUDED.description, category = EXCLUDED.category,
    website_url = EXCLUDED.website_url, tags = EXCLUDED.tags, pricing = EXCLUDED.pricing;
