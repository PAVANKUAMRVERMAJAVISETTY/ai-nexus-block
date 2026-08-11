-- AI Nexus Block: Nexus IDE — AI coding agent sessions (Phase 8)
--
-- ADDITIVE ONLY. Safe to re-run. Requires 20260811000000_nexus_ide_v2.sql.
--
-- WHY A TABLE RATHER THAN AN IN-REQUEST LOOP
--
-- The agent loop must run commands, and commands execute asynchronously on the
-- user's own machine: server enqueues -> local agent polls (~3s) -> runs the
-- command (seconds to minutes) -> reports back. A serverless request cannot sit
-- and wait for that.
--
-- So the loop is a state machine persisted here. Each request advances it as
-- far as it can, then parks (awaiting_command / awaiting_approval) and returns.
-- The client polls to resume it. This also makes the loop crash-safe and
-- cancellable, which an in-memory loop would not be.

CREATE TABLE IF NOT EXISTS public.ide_agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.ide_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,

  -- The request that started this task.
  goal text NOT NULL,

  status text NOT NULL DEFAULT 'planning' CHECK (status IN (
    'planning',            -- calling the model for its next decision
    'awaiting_command',    -- a run is queued; waiting for the local agent
    'awaiting_approval',   -- a change proposal needs the user
    'awaiting_input',      -- the assistant asked the user a question
    'completed',
    'failed',
    'cancelled'
  )),

  -- Full turn-by-turn record: model messages, tool calls, observations.
  -- Drives both the UI activity feed and the context sent to the model.
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Loop safety counters.
  iterations integer NOT NULL DEFAULT 0,
  tool_calls integer NOT NULL DEFAULT 0,
  repair_attempts integer NOT NULL DEFAULT 0,

  -- What the loop is currently parked on.
  pending_run_id uuid REFERENCES public.ide_project_runs(id) ON DELETE SET NULL,
  pending_action_id uuid REFERENCES public.ide_agent_actions(id) ON DELETE SET NULL,
  pending_question text,

  -- Final report. `success` is set ONLY from real verification results.
  summary text,
  success boolean,
  error_message text,

  -- Co-operative cancellation: the loop checks this at every step.
  cancel_requested boolean NOT NULL DEFAULT false,

  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  finished_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_ide_agent_sessions_project
  ON public.ide_agent_sessions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ide_agent_sessions_active
  ON public.ide_agent_sessions(user_id, status)
  WHERE status IN ('planning', 'awaiting_command', 'awaiting_approval', 'awaiting_input');

ALTER TABLE public.ide_agent_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "IDE agent sessions owner policy" ON public.ide_agent_sessions;
CREATE POLICY "IDE agent sessions owner policy" ON public.ide_agent_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_ide_agent_sessions_updated_at ON public.ide_agent_sessions;
CREATE TRIGGER trg_ide_agent_sessions_updated_at
  BEFORE UPDATE ON public.ide_agent_sessions
  FOR EACH ROW EXECUTE FUNCTION public.ide_set_updated_at();

-- Link an action back to the session that proposed it, so approving a diff can
-- resume the exact loop that was waiting on it.
ALTER TABLE public.ide_agent_actions
  ADD COLUMN IF NOT EXISTS session_id uuid
    REFERENCES public.ide_agent_sessions(id) ON DELETE SET NULL;

-- Same for runs, so a finished command can be matched to its waiting session.
ALTER TABLE public.ide_project_runs
  ADD COLUMN IF NOT EXISTS session_id uuid
    REFERENCES public.ide_agent_sessions(id) ON DELETE SET NULL;
