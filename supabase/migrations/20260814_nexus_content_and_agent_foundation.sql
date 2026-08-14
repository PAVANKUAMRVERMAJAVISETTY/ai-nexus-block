-- ============================================================
-- AI NEXUS BLOCK
-- Nexus Content + Agent Foundation
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- SUPER ADMIN AUTHORIZATION HELPER
-- Uses the EXISTING public.profiles table.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'super_admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;

-- ============================================================
-- SITE SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    setting_key TEXT NOT NULL UNIQUE,

    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,

    description TEXT,

    is_public BOOLEAN NOT NULL DEFAULT TRUE,

    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_settings_key
ON public.site_settings(setting_key);

-- ============================================================
-- PUBLIC OWNER PROFILE
-- Keeps authentication profile separate from rich public
-- portfolio/profile content.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    profile_key TEXT NOT NULL UNIQUE DEFAULT 'owner',

    full_name TEXT,

    professional_title TEXT,

    profile_photo_url TEXT,

    short_bio TEXT,

    full_bio TEXT,

    skills JSONB NOT NULL DEFAULT '[]'::jsonb,

    education JSONB NOT NULL DEFAULT '[]'::jsonb,

    experience JSONB NOT NULL DEFAULT '[]'::jsonb,

    achievements JSONB NOT NULL DEFAULT '[]'::jsonb,

    resume_url TEXT,

    github_url TEXT,

    linkedin_url TEXT,

    website_url TEXT,

    contact_email TEXT,

    contact_phone TEXT,

    social_links JSONB NOT NULL DEFAULT '[]'::jsonb,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    is_public BOOLEAN NOT NULL DEFAULT TRUE,

    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_profile_public
ON public.site_profile(is_public);

INSERT INTO public.site_profile(profile_key)
VALUES ('owner')
ON CONFLICT (profile_key) DO NOTHING;

-- ============================================================
-- AI TOOLS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nexus_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    slug TEXT NOT NULL UNIQUE,

    name TEXT NOT NULL,

    tagline TEXT,

    description TEXT,

    category TEXT,

    website_url TEXT,

    documentation_url TEXT,

    logo_url TEXT,

    features JSONB NOT NULL DEFAULT '[]'::jsonb,

    use_cases JSONB NOT NULL DEFAULT '[]'::jsonb,

    tags JSONB NOT NULL DEFAULT '[]'::jsonb,

    pricing JSONB NOT NULL DEFAULT '{}'::jsonb,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    featured BOOLEAN NOT NULL DEFAULT FALSE,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),

    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_tools_status
ON public.nexus_tools(status);

CREATE INDEX IF NOT EXISTS idx_nexus_tools_category
ON public.nexus_tools(category);

CREATE INDEX IF NOT EXISTS idx_nexus_tools_featured
ON public.nexus_tools(featured);

CREATE INDEX IF NOT EXISTS idx_nexus_tools_search
ON public.nexus_tools
USING GIN (
    to_tsvector(
        'simple',
        coalesce(name, '') || ' ' ||
        coalesce(tagline, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(category, '') || ' ' ||
        coalesce(tags::text, '')
    )
);

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nexus_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    slug TEXT NOT NULL UNIQUE,

    title TEXT NOT NULL,

    description TEXT,

    long_description TEXT,

    project_type TEXT,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),

    tags JSONB NOT NULL DEFAULT '[]'::jsonb,

    tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,

    features JSONB NOT NULL DEFAULT '[]'::jsonb,

    architecture JSONB NOT NULL DEFAULT '{}'::jsonb,

    repository_url TEXT,

    live_url TEXT,

    image_url TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    featured BOOLEAN NOT NULL DEFAULT FALSE,

    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_projects_status
ON public.nexus_projects(status);

CREATE INDEX IF NOT EXISTS idx_nexus_projects_featured
ON public.nexus_projects(featured);

CREATE INDEX IF NOT EXISTS idx_nexus_projects_search
ON public.nexus_projects
USING GIN (
    to_tsvector(
        'simple',
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(long_description, '') || ' ' ||
        coalesce(project_type, '') || ' ' ||
        coalesce(tags::text, '') || ' ' ||
        coalesce(tech_stack::text, '')
    )
);

-- ============================================================
-- KNOWLEDGE ARTICLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nexus_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    slug TEXT NOT NULL UNIQUE,

    title TEXT NOT NULL,

    excerpt TEXT,

    content TEXT,

    category TEXT,

    tags JSONB NOT NULL DEFAULT '[]'::jsonb,

    source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    featured BOOLEAN NOT NULL DEFAULT FALSE,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),

    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_knowledge_status
ON public.nexus_knowledge(status);

CREATE INDEX IF NOT EXISTS idx_nexus_knowledge_category
ON public.nexus_knowledge(category);

CREATE INDEX IF NOT EXISTS idx_nexus_knowledge_search
ON public.nexus_knowledge
USING GIN (
    to_tsvector(
        'simple',
        coalesce(title, '') || ' ' ||
        coalesce(excerpt, '') || ' ' ||
        coalesce(content, '') || ' ' ||
        coalesce(category, '') || ' ' ||
        coalesce(tags::text, '')
    )
);

-- ============================================================
-- ROADMAPS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nexus_roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    slug TEXT NOT NULL UNIQUE,

    title TEXT NOT NULL,

    description TEXT,

    level TEXT,

    steps JSONB NOT NULL DEFAULT '[]'::jsonb,

    prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,

    technologies JSONB NOT NULL DEFAULT '[]'::jsonb,

    tags JSONB NOT NULL DEFAULT '[]'::jsonb,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    featured BOOLEAN NOT NULL DEFAULT FALSE,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),

    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_roadmaps_status
ON public.nexus_roadmaps(status);

CREATE INDEX IF NOT EXISTS idx_nexus_roadmaps_search
ON public.nexus_roadmaps
USING GIN (
    to_tsvector(
        'simple',
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(level, '') || ' ' ||
        coalesce(tags::text, '') || ' ' ||
        coalesce(technologies::text, '')
    )
);

-- ============================================================
-- PENDING KNOWLEDGE REVIEWS
-- External discoveries are staged here before publishing.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pending_knowledge_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,

    target_type TEXT NOT NULL
        CHECK (
            target_type IN (
                'tool',
                'project',
                'knowledge',
                'roadmap',
                'resource',
                'profile'
            )
        ),

    summary TEXT NOT NULL,

    proposed_content JSONB NOT NULL DEFAULT '{}'::jsonb,

    source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,

    source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'approved',
                'rejected'
            )
        ),

    rejection_reason TEXT,

    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_knowledge_status
ON public.pending_knowledge_reviews(status);

CREATE INDEX IF NOT EXISTS idx_pending_knowledge_target
ON public.pending_knowledge_reviews(target_type);

-- ============================================================
-- AI AGENT ACTION AUDIT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    action_name TEXT NOT NULL,

    action_category TEXT NOT NULL,

    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    target_type TEXT,

    target_id UUID,

    input_data JSONB NOT NULL DEFAULT '{}'::jsonb,

    result_data JSONB NOT NULL DEFAULT '{}'::jsonb,

    status TEXT NOT NULL DEFAULT 'success'
        CHECK (
            status IN (
                'success',
                'failed',
                'denied'
            )
        ),

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_user
ON public.ai_agent_actions(requested_by);

CREATE INDEX IF NOT EXISTS idx_ai_agent_actions_created
ON public.ai_agent_actions(created_at DESC);

-- ============================================================
-- MEDIA ASSET REGISTRY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.nexus_media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    media_type TEXT NOT NULL
        CHECK (
            media_type IN (
                'image',
                'video',
                'audio',
                'document'
            )
        ),

    storage_bucket TEXT NOT NULL,

    storage_path TEXT NOT NULL,

    original_filename TEXT,

    mime_type TEXT,

    file_size_bytes BIGINT,

    processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            processing_status IN (
                'pending',
                'processing',
                'ready',
                'failed'
            )
        ),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nexus_media_owner
ON public.nexus_media_assets(owner_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.nexus_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_settings_updated_at
ON public.site_settings;

CREATE TRIGGER trg_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.nexus_set_updated_at();

DROP TRIGGER IF EXISTS trg_site_profile_updated_at
ON public.site_profile;

CREATE TRIGGER trg_site_profile_updated_at
BEFORE UPDATE ON public.site_profile
FOR EACH ROW
EXECUTE FUNCTION public.nexus_set_updated_at();

DROP TRIGGER IF EXISTS trg_nexus_tools_updated_at
ON public.nexus_tools;

CREATE TRIGGER trg_nexus_tools_updated_at
BEFORE UPDATE ON public.nexus_tools
FOR EACH ROW
EXECUTE FUNCTION public.nexus_set_updated_at();

DROP TRIGGER IF EXISTS trg_nexus_projects_updated_at
ON public.nexus_projects;

CREATE TRIGGER trg_nexus_projects_updated_at
BEFORE UPDATE ON public.nexus_projects
FOR EACH ROW
EXECUTE FUNCTION public.nexus_set_updated_at();

DROP TRIGGER IF EXISTS trg_nexus_knowledge_updated_at
ON public.nexus_knowledge;

CREATE TRIGGER trg_nexus_knowledge_updated_at
BEFORE UPDATE ON public.nexus_knowledge
FOR EACH ROW
EXECUTE FUNCTION public.nexus_set_updated_at();

DROP TRIGGER IF EXISTS trg_nexus_roadmaps_updated_at
ON public.nexus_roadmaps;

CREATE TRIGGER trg_nexus_roadmaps_updated_at
BEFORE UPDATE ON public.nexus_roadmaps
FOR EACH ROW
EXECUTE FUNCTION public.nexus_set_updated_at();

DROP TRIGGER IF EXISTS trg_pending_knowledge_updated_at
ON public.pending_knowledge_reviews;

CREATE TRIGGER trg_pending_knowledge_updated_at
BEFORE UPDATE ON public.pending_knowledge_reviews
FOR EACH ROW
EXECUTE FUNCTION public.nexus_set_updated_at();

DROP TRIGGER IF EXISTS trg_nexus_media_updated_at
ON public.nexus_media_assets;

CREATE TRIGGER trg_nexus_media_updated_at
BEFORE UPDATE ON public.nexus_media_assets
FOR EACH ROW
EXECUTE FUNCTION public.nexus_set_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_knowledge_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nexus_media_assets ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PUBLIC READ: ONLY PUBLISHED / PUBLIC CONTENT
-- ============================================================

DROP POLICY IF EXISTS "public_read_site_settings"
ON public.site_settings;

CREATE POLICY "public_read_site_settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (is_public = TRUE);

DROP POLICY IF EXISTS "public_read_site_profile"
ON public.site_profile;

CREATE POLICY "public_read_site_profile"
ON public.site_profile
FOR SELECT
TO anon, authenticated
USING (is_public = TRUE);

DROP POLICY IF EXISTS "public_read_tools"
ON public.nexus_tools;

CREATE POLICY "public_read_tools"
ON public.nexus_tools
FOR SELECT
TO anon, authenticated
USING (status = 'published');

DROP POLICY IF EXISTS "public_read_projects"
ON public.nexus_projects;

CREATE POLICY "public_read_projects"
ON public.nexus_projects
FOR SELECT
TO anon, authenticated
USING (status = 'published');

DROP POLICY IF EXISTS "public_read_knowledge"
ON public.nexus_knowledge;

CREATE POLICY "public_read_knowledge"
ON public.nexus_knowledge
FOR SELECT
TO anon, authenticated
USING (status = 'published');

DROP POLICY IF EXISTS "public_read_roadmaps"
ON public.nexus_roadmaps;

CREATE POLICY "public_read_roadmaps"
ON public.nexus_roadmaps
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- ============================================================
-- SUPER ADMIN FULL ACCESS
-- ============================================================

DROP POLICY IF EXISTS "super_admin_site_settings"
ON public.site_settings;

CREATE POLICY "super_admin_site_settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_site_profile"
ON public.site_profile;

CREATE POLICY "super_admin_site_profile"
ON public.site_profile
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_tools"
ON public.nexus_tools;

CREATE POLICY "super_admin_tools"
ON public.nexus_tools
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_projects"
ON public.nexus_projects;

CREATE POLICY "super_admin_projects"
ON public.nexus_projects
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_knowledge"
ON public.nexus_knowledge;

CREATE POLICY "super_admin_knowledge"
ON public.nexus_knowledge
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_roadmaps"
ON public.nexus_roadmaps;

CREATE POLICY "super_admin_roadmaps"
ON public.nexus_roadmaps
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_pending_reviews"
ON public.pending_knowledge_reviews;

CREATE POLICY "super_admin_pending_reviews"
ON public.pending_knowledge_reviews
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_agent_actions"
ON public.ai_agent_actions;

CREATE POLICY "super_admin_agent_actions"
ON public.ai_agent_actions
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "owner_media_assets"
ON public.nexus_media_assets;

CREATE POLICY "owner_media_assets"
ON public.nexus_media_assets
FOR ALL
TO authenticated
USING (
    owner_id = auth.uid()
    OR public.is_super_admin()
)
WITH CHECK (
    owner_id = auth.uid()
    OR public.is_super_admin()
);

-- ============================================================
-- DEFAULT SITE SETTINGS
-- ============================================================

INSERT INTO public.site_settings
(
    setting_key,
    setting_value,
    description,
    is_public
)
VALUES
(
    'assistant_name',
    '"Nexus AI Assistant"'::jsonb,
    'Public AI assistant name',
    TRUE
),
(
    'site_title',
    '"AI Nexus Block"'::jsonb,
    'Main site title',
    TRUE
),
(
    'about_intro_enabled',
    'true'::jsonb,
    'Enable About Me visitor introduction',
    TRUE
),
(
    'about_intro_duration_ms',
    '5000'::jsonb,
    'About Me introduction duration',
    TRUE
)
ON CONFLICT (setting_key)
DO NOTHING;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets
(
    id,
    name,
    public
)
VALUES
(
    'nexus-profile',
    'nexus-profile',
    TRUE
)
ON CONFLICT (id)
DO NOTHING;

INSERT INTO storage.buckets
(
    id,
    name,
    public
)
VALUES
(
    'nexus-media-vault',
    'nexus-media-vault',
    FALSE
)
ON CONFLICT (id)
DO NOTHING;

-- ============================================================
-- PROFILE STORAGE POLICY
-- ============================================================

DROP POLICY IF EXISTS "super_admin_profile_storage_insert"
ON storage.objects;

CREATE POLICY "super_admin_profile_storage_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'nexus-profile'
    AND public.is_super_admin()
);

DROP POLICY IF EXISTS "super_admin_profile_storage_update"
ON storage.objects;

CREATE POLICY "super_admin_profile_storage_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'nexus-profile'
    AND public.is_super_admin()
)
WITH CHECK (
    bucket_id = 'nexus-profile'
    AND public.is_super_admin()
);

DROP POLICY IF EXISTS "super_admin_profile_storage_delete"
ON storage.objects;

CREATE POLICY "super_admin_profile_storage_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'nexus-profile'
    AND public.is_super_admin()
);

-- ============================================================
-- MEDIA VAULT STORAGE POLICY
-- ============================================================

DROP POLICY IF EXISTS "owner_media_vault_insert"
ON storage.objects;

CREATE POLICY "owner_media_vault_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'nexus-media-vault'
    AND public.is_super_admin()
);

DROP POLICY IF EXISTS "owner_media_vault_select"
ON storage.objects;

CREATE POLICY "owner_media_vault_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'nexus-media-vault'
    AND public.is_super_admin()
);

DROP POLICY IF EXISTS "owner_media_vault_update"
ON storage.objects;

CREATE POLICY "owner_media_vault_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'nexus-media-vault'
    AND public.is_super_admin()
)
WITH CHECK (
    bucket_id = 'nexus-media-vault'
    AND public.is_super_admin()
);

DROP POLICY IF EXISTS "owner_media_vault_delete"
ON storage.objects;

CREATE POLICY "owner_media_vault_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'nexus-media-vault'
    AND public.is_super_admin()
);

-- ============================================================
-- END
-- ============================================================
