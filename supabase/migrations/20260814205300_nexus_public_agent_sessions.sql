-- ============================================================
-- PHASE 9 — PUBLIC NEXUS AGENT SESSION STATE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_public_agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL UNIQUE
        REFERENCES public.ai_conversations(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    state JSONB NOT NULL DEFAULT '{}'::jsonb,

    status TEXT NOT NULL DEFAULT 'planning'
        CHECK (
            status IN (
                'planning',
                'awaiting_input',
                'awaiting_approval',
                'awaiting_command',
                'completed',
                'failed',
                'cancelled'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_public_agent_sessions_user
    ON public.ai_public_agent_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_public_agent_sessions_updated
    ON public.ai_public_agent_sessions(updated_at DESC);

ALTER TABLE public.ai_public_agent_sessions
    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own public agent sessions"
    ON public.ai_public_agent_sessions;

DROP POLICY IF EXISTS "Users can create own public agent sessions"
    ON public.ai_public_agent_sessions;

DROP POLICY IF EXISTS "Users can update own public agent sessions"
    ON public.ai_public_agent_sessions;

DROP POLICY IF EXISTS "Users can delete own public agent sessions"
    ON public.ai_public_agent_sessions;

CREATE POLICY "Users can view own public agent sessions"
ON public.ai_public_agent_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own public agent sessions"
ON public.ai_public_agent_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own public agent sessions"
ON public.ai_public_agent_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own public agent sessions"
ON public.ai_public_agent_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
-- ============================================================
-- TABLE PRIVILEGES
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.ai_public_agent_sessions
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.ai_public_agent_sessions
TO service_role;

