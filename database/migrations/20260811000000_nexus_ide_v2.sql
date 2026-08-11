-- AI Nexus Block: Nexus IDE v2 Schema
--
-- ADDITIVE ONLY. This migration is safe to run whether or not
-- 20260810000003_nexus_ide.sql was previously applied:
--   * CREATE TABLE IF NOT EXISTS creates the corrected shape on a fresh database
--   * ALTER TABLE ... ADD COLUMN IF NOT EXISTS upgrades a v1 database in place
--   * No existing table outside the ide_* namespace is touched
--
-- Ownership model: every row is owned by exactly one auth.users id.
-- RLS is enforced on every table. The browser never supplies user_id.

-- ---------------------------------------------------------------------------
-- 0. Shared helper: keep updated_at honest without relying on app code
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ide_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. ide_projects — a user's IDE workspace
-- ---------------------------------------------------------------------------
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

ALTER TABLE public.ide_projects
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS primary_language text NOT NULL DEFAULT 'typescript',
  ADD COLUMN IF NOT EXISTS package_manager text NOT NULL DEFAULT 'npm',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS workspace_hint text,
  ADD COLUMN IF NOT EXISTS last_opened_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_ide_projects_user_id ON public.ide_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_ide_projects_last_opened ON public.ide_projects(user_id, last_opened_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ide_projects_user_slug ON public.ide_projects(user_id, slug) WHERE slug IS NOT NULL;

ALTER TABLE public.ide_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE projects owner policy" ON public.ide_projects;
CREATE POLICY "IDE projects owner policy" ON public.ide_projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_ide_projects_updated_at ON public.ide_projects;
CREATE TRIGGER trg_ide_projects_updated_at
  BEFORE UPDATE ON public.ide_projects
  FOR EACH ROW EXECUTE FUNCTION public.ide_set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. ide_project_files — the canonical virtual filesystem
-- ---------------------------------------------------------------------------
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

ALTER TABLE public.ide_project_files
  ADD COLUMN IF NOT EXISTS parent_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_binary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'user';

CREATE INDEX IF NOT EXISTS idx_ide_project_files_project_id ON public.ide_project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_ide_project_files_user_id ON public.ide_project_files(user_id);
CREATE INDEX IF NOT EXISTS idx_ide_project_files_parent ON public.ide_project_files(project_id, parent_path);

ALTER TABLE public.ide_project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE project files owner policy" ON public.ide_project_files;
CREATE POLICY "IDE project files owner policy" ON public.ide_project_files
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_ide_project_files_updated_at ON public.ide_project_files;
CREATE TRIGGER trg_ide_project_files_updated_at
  BEFORE UPDATE ON public.ide_project_files
  FOR EACH ROW EXECUTE FUNCTION public.ide_set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. ide_agent_devices — paired Nexus Local Development Agents
--    Only a SHA-256 hash of the device token is ever stored.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ide_agent_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Local Agent',
  token_hash text NOT NULL,
  token_prefix text NOT NULL,
  pairing_code text,
  pairing_expires_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  platform text,
  agent_version text,
  workspace_root text,
  last_seen_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ide_agent_devices_token_hash ON public.ide_agent_devices(token_hash);
CREATE INDEX IF NOT EXISTS idx_ide_agent_devices_user ON public.ide_agent_devices(user_id, status);

ALTER TABLE public.ide_agent_devices ENABLE ROW LEVEL SECURITY;

-- Users may see and revoke their own devices. token_hash is never selected by
-- application code; pairing is completed server-side with the service role.
DROP POLICY IF EXISTS "IDE agent devices owner policy" ON public.ide_agent_devices;
CREATE POLICY "IDE agent devices owner policy" ON public.ide_agent_devices
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_ide_agent_devices_updated_at ON public.ide_agent_devices;
CREATE TRIGGER trg_ide_agent_devices_updated_at
  BEFORE UPDATE ON public.ide_agent_devices
  FOR EACH ROW EXECUTE FUNCTION public.ide_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. ide_project_runs — one row per command execution request
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ide_project_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ide_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  stdout text NOT NULL DEFAULT '',
  stderr text NOT NULL DEFAULT '',
  exit_code integer,
  duration_ms bigint,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ide_project_runs
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES public.ide_agent_devices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS finished_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS triggered_by text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS action_id uuid;

-- v1 restricted status to (running, success, error). The queue needs more.
ALTER TABLE public.ide_project_runs DROP CONSTRAINT IF EXISTS ide_project_runs_status_check;
ALTER TABLE public.ide_project_runs
  ADD CONSTRAINT ide_project_runs_status_check
  CHECK (status IN ('queued', 'claimed', 'running', 'success', 'error', 'cancelled', 'timeout'));

ALTER TABLE public.ide_project_runs ALTER COLUMN status SET DEFAULT 'queued';

CREATE INDEX IF NOT EXISTS idx_ide_project_runs_project_id ON public.ide_project_runs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ide_project_runs_queue ON public.ide_project_runs(user_id, status) WHERE status = 'queued';

ALTER TABLE public.ide_project_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE project runs owner policy" ON public.ide_project_runs;
CREATE POLICY "IDE project runs owner policy" ON public.ide_project_runs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. ide_run_logs — incremental stdout/stderr chunks streamed by the agent
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ide_run_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ide_project_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream text NOT NULL CHECK (stream IN ('stdout', 'stderr', 'system')),
  seq integer NOT NULL DEFAULT 0,
  chunk text NOT NULL DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ide_run_logs_run ON public.ide_run_logs(run_id, seq);

ALTER TABLE public.ide_run_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE run logs owner policy" ON public.ide_run_logs;
CREATE POLICY "IDE run logs owner policy" ON public.ide_run_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. ide_problems — normalized diagnostics from tsc / eslint / build / tests
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ide_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ide_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.ide_project_runs(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'unknown',
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('error', 'warning', 'info')),
  file_path text,
  line integer,
  "column" integer,
  code text,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ide_problems_project ON public.ide_problems(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ide_problems_run ON public.ide_problems(run_id);

ALTER TABLE public.ide_problems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE problems owner policy" ON public.ide_problems;
CREATE POLICY "IDE problems owner policy" ON public.ide_problems
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7. ide_agent_actions — auditable AI change proposals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ide_agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ide_projects(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  proposed_change jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  result_log text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ide_agent_actions
  ADD COLUMN IF NOT EXISTS conversation_id uuid,
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'AI change proposal',
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS risk text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS files_affected text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS command_executed text,
  ADD COLUMN IF NOT EXISTS validation_run_id uuid REFERENCES public.ide_project_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_used text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS applied_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- v1 omitted 'failed'; governance requires the full lifecycle.
ALTER TABLE public.ide_agent_actions DROP CONSTRAINT IF EXISTS ide_agent_actions_status_check;
ALTER TABLE public.ide_agent_actions
  ADD CONSTRAINT ide_agent_actions_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'failed', 'reverted'));

CREATE INDEX IF NOT EXISTS idx_ide_agent_actions_project ON public.ide_agent_actions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ide_agent_actions_status ON public.ide_agent_actions(requested_by, status);

ALTER TABLE public.ide_agent_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE agent actions owner policy" ON public.ide_agent_actions;
CREATE POLICY "IDE agent actions owner policy" ON public.ide_agent_actions
  FOR ALL USING (auth.uid() = requested_by) WITH CHECK (auth.uid() = requested_by);

DROP TRIGGER IF EXISTS trg_ide_agent_actions_updated_at ON public.ide_agent_actions;
CREATE TRIGGER trg_ide_agent_actions_updated_at
  BEFORE UPDATE ON public.ide_agent_actions
  FOR EACH ROW EXECUTE FUNCTION public.ide_set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. ide_project_index — reusable project knowledge (Phase 6)
--    Avoids shipping the whole repository to a model on every request.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ide_project_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ide_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_count integer NOT NULL DEFAULT 0,
  is_stale boolean NOT NULL DEFAULT false,
  generated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_ide_project_index_project ON public.ide_project_index(project_id);

ALTER TABLE public.ide_project_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE project index owner policy" ON public.ide_project_index;
CREATE POLICY "IDE project index owner policy" ON public.ide_project_index
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 9. ide_project_connections — GitHub / Supabase / Vercel / Netlify links
--    Created now so the schema is stable. Secret material is NEVER stored here;
--    credential_ref points at server-side secret storage only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ide_project_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ide_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('github', 'supabase', 'vercel', 'netlify')),
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'pending', 'connected', 'error')),
  external_id text,
  display_name text,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  credential_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_ide_project_connections_project ON public.ide_project_connections(project_id);

ALTER TABLE public.ide_project_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE project connections owner policy" ON public.ide_project_connections;
CREATE POLICY "IDE project connections owner policy" ON public.ide_project_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_ide_project_connections_updated_at ON public.ide_project_connections;
CREATE TRIGGER trg_ide_project_connections_updated_at
  BEFORE UPDATE ON public.ide_project_connections
  FOR EACH ROW EXECUTE FUNCTION public.ide_set_updated_at();
