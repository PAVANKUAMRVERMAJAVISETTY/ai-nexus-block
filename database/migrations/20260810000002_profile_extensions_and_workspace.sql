-- AI Nexus Block: Phase 2 Database Extensions & Workspaces

-- 1. Extend public.profiles table with education, experience, career, and social details
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS degree text,
  ADD COLUMN IF NOT EXISTS specialization text,
  ADD COLUMN IF NOT EXISTS graduation_year text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_roles text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS learning_goals text,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS portfolio_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS bio text;

-- 2. Create public.user_files table for private file management metadata
CREATE TABLE IF NOT EXISTS public.user_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  category text NOT NULL DEFAULT 'general',
  title text,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON public.user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_category ON public.user_files(category);

ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User files owner policy" ON public.user_files;
CREATE POLICY "User files owner policy" ON public.user_files
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Create public.user_research table for personal research bookmarks & notes
CREATE TABLE IF NOT EXISTS public.user_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  url text,
  summary text,
  personal_notes text,
  opinion text,
  pros text[] DEFAULT '{}'::text[],
  cons text[] DEFAULT '{}'::text[],
  pricing_info text,
  tags text[] DEFAULT '{}'::text[],
  image_url text,
  image_source_url text,
  image_source_type text,
  alt_text text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_research_user_id ON public.user_research(user_id);
CREATE INDEX IF NOT EXISTS idx_user_research_category ON public.user_research(category);

ALTER TABLE public.user_research ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User research owner policy" ON public.user_research;
CREATE POLICY "User research owner policy" ON public.user_research
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Create public.research_files table for files attached to research entries
CREATE TABLE IF NOT EXISTS public.research_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id uuid NOT NULL REFERENCES public.user_research(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.user_files(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.research_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Research files owner policy" ON public.research_files;
CREATE POLICY "Research files owner policy" ON public.research_files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_research
      WHERE id = research_files.research_id AND user_id = auth.uid()
    )
  );

-- 5. Create public.ai_discoveries table for AI discovery detection & admin workflow
CREATE TABLE IF NOT EXISTS public.ai_discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL,
  source_url text,
  reason_detected text,
  image_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_discoveries_status ON public.ai_discoveries(status);

ALTER TABLE public.ai_discoveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Discoveries user select policy" ON public.ai_discoveries;
CREATE POLICY "Discoveries user select policy" ON public.ai_discoveries
  FOR SELECT
  USING (
    auth.uid() = detected_by_user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Discoveries user insert policy" ON public.ai_discoveries;
CREATE POLICY "Discoveries user insert policy" ON public.ai_discoveries
  FOR INSERT
  WITH CHECK (auth.uid() = detected_by_user_id OR detected_by_user_id IS NULL);

DROP POLICY IF EXISTS "Discoveries admin update policy" ON public.ai_discoveries;
CREATE POLICY "Discoveries admin update policy" ON public.ai_discoveries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 6. Create public.agent_change_requests table for audit history of admin website updates
CREATE TABLE IF NOT EXISTS public.agent_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  title text NOT NULL,
  proposed_change jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'failed')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  result text,
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.agent_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agent change requests super_admin policy" ON public.agent_change_requests;
CREATE POLICY "Agent change requests super_admin policy" ON public.agent_change_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
