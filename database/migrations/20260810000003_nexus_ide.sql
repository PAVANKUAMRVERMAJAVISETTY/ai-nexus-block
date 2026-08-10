-- AI Nexus Block: Nexus IDE Subsystem Migration

-- 1. Create public.ide_projects table for user IDE workspaces
CREATE TABLE IF NOT EXISTS public.ide_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template text NOT NULL DEFAULT 'nextjs_fullstack',
  framework text NOT NULL DEFAULT 'Next.js',
  git_repository_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ide_projects_user_id ON public.ide_projects(user_id);

ALTER TABLE public.ide_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE projects owner policy" ON public.ide_projects;
CREATE POLICY "IDE projects owner policy" ON public.ide_projects
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Create public.ide_project_files table for virtual workspace filesystem
CREATE TABLE IF NOT EXISTS public.ide_project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ide_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  filename text NOT NULL,
  content text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'typescript',
  size bigint NOT NULL DEFAULT 0,
  is_directory boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, file_path)
);

CREATE INDEX IF NOT EXISTS idx_ide_project_files_project_id ON public.ide_project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_ide_project_files_user_id ON public.ide_project_files(user_id);

ALTER TABLE public.ide_project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE project files owner policy" ON public.ide_project_files;
CREATE POLICY "IDE project files owner policy" ON public.ide_project_files
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Create public.ide_project_runs table for command execution log
CREATE TABLE IF NOT EXISTS public.ide_project_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ide_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error')),
  stdout text NOT NULL DEFAULT '',
  stderr text NOT NULL DEFAULT '',
  exit_code integer,
  duration_ms bigint,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ide_project_runs_project_id ON public.ide_project_runs(project_id);

ALTER TABLE public.ide_project_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE project runs owner policy" ON public.ide_project_runs;
CREATE POLICY "IDE project runs owner policy" ON public.ide_project_runs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Create public.ide_agent_actions table for AI code modification proposals
CREATE TABLE IF NOT EXISTS public.ide_agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ide_projects(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  proposed_change jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  result_log text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ide_agent_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE agent actions owner policy" ON public.ide_agent_actions;
CREATE POLICY "IDE agent actions owner policy" ON public.ide_agent_actions
  FOR ALL
  USING (auth.uid() = requested_by)
  WITH CHECK (auth.uid() = requested_by);
