-- AI Nexus Block: Nexus IDE — GitHub Integration (Phase 7)
--
-- ADDITIVE ONLY. Safe to re-run. Requires 20260811000000_nexus_ide_v2.sql.
--
-- Design note: a GitHub account is connected once per USER, not per project,
-- so it lives in a new `ide_user_connections` table. The existing per-project
-- `ide_project_connections` table is reused unchanged to record which
-- repository a given project is linked to — no duplicate provider table.

-- ---------------------------------------------------------------------------
-- 1. ide_user_connections — a user's connected GitHub account
--
-- SECURITY: `access_token_encrypted` holds AES-256-GCM ciphertext produced by
-- lib/security/crypto.ts. The encryption key lives in the server environment,
-- never in the database, so a database dump alone yields no usable tokens.
-- No application code ever selects the token columns into a browser response.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ide_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'github' CHECK (provider IN ('github')),

  -- Public, displayable identity.
  external_id text,
  external_login text,
  avatar_url text,

  -- Credential material. Encrypted at rest; never returned to a client.
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamp with time zone,
  token_fingerprint text,

  scopes text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'connected'
    CHECK (status IN ('connected', 'expired', 'revoked')),

  connected_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- One connection per provider per user; reconnecting updates in place.
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_ide_user_connections_user
  ON public.ide_user_connections(user_id, provider);

ALTER TABLE public.ide_user_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE user connections owner policy" ON public.ide_user_connections;
CREATE POLICY "IDE user connections owner policy" ON public.ide_user_connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_ide_user_connections_updated_at ON public.ide_user_connections;
CREATE TRIGGER trg_ide_user_connections_updated_at
  BEFORE UPDATE ON public.ide_user_connections
  FOR EACH ROW EXECUTE FUNCTION public.ide_set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. ide_project_runs — carry structured Git operations
--
-- Git cannot use the free-form `command` path: shell metacharacters are
-- legitimate inside commit messages but are (correctly) rejected by the
-- command validator. A validated operation is stored as JSON instead, and the
-- agent builds argv from it. `operation` NEVER contains credentials — those are
-- injected at hand-off and are not persisted.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ide_project_runs
  ADD COLUMN IF NOT EXISTS operation jsonb,
  ADD COLUMN IF NOT EXISTS result jsonb;

CREATE INDEX IF NOT EXISTS idx_ide_project_runs_operation
  ON public.ide_project_runs ((operation->>'op'))
  WHERE operation IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. ide_projects — remember the linked repository and its workspace state
-- ---------------------------------------------------------------------------
ALTER TABLE public.ide_projects
  ADD COLUMN IF NOT EXISTS github_repo_full_name text,
  ADD COLUMN IF NOT EXISTS github_default_branch text,
  ADD COLUMN IF NOT EXISTS github_connection_id uuid
    REFERENCES public.ide_user_connections(id) ON DELETE SET NULL,
  -- True once an agent has actually cloned the repository locally, so the UI
  -- can distinguish "linked" from "cloned and ready".
  ADD COLUMN IF NOT EXISTS git_cloned_at timestamp with time zone;

-- ---------------------------------------------------------------------------
-- 4. ide_project_connections — allow the project→repo link to be recorded
--    (table already exists from v2; nothing structural changes here)
-- ---------------------------------------------------------------------------
COMMENT ON TABLE public.ide_project_connections IS
  'Per-project provider links (e.g. which GitHub repository a project tracks). '
  'Account-level credentials live in ide_user_connections, never here.';
