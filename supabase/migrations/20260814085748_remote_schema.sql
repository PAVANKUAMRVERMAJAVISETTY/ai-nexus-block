-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    new.email
  );

  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;

GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;

GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

CREATE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;

GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;

CREATE TABLE public.agent_change_requests (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  requested_by    uuid                     NOT NULL,
  action_type     text                     NOT NULL,
  target_type     text,
  target_id       uuid,
  title           text,
  proposed_change jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  status          text                     DEFAULT 'pending'::text NOT NULL,
  approved_by     uuid,
  approved_at     timestamp with time zone,
  result          jsonb,
  error_message   text,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  updated_at      timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.agent_change_requests
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.agent_change_requests
  ADD CONSTRAINT agent_change_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);

ALTER TABLE public.agent_change_requests
  ADD CONSTRAINT agent_change_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.agent_change_requests
  ADD CONSTRAINT agent_change_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.agent_change_requests
  ADD CONSTRAINT agent_change_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'applied'::text, 'failed'::text]));

GRANT ALL ON public.agent_change_requests TO anon;

GRANT ALL ON public.agent_change_requests TO authenticated;

GRANT ALL ON public.agent_change_requests TO service_role;

CREATE INDEX idx_agent_change_requests_requested_by ON public.agent_change_requests (requested_by);

CREATE INDEX idx_agent_change_requests_status ON public.agent_change_requests (status);

CREATE POLICY "Users can create own change requests" ON public.agent_change_requests
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = requested_by));

CREATE POLICY "Users can view own change requests" ON public.agent_change_requests
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = requested_by));

CREATE TABLE public.ai_conversations (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id     uuid                     NOT NULL,
  title       text                     DEFAULT 'New Conversation'::text NOT NULL,
  mode        text                     DEFAULT 'recommend_stack'::text NOT NULL,
  provider    text                     DEFAULT 'gemini'::text NOT NULL,
  is_archived boolean                  DEFAULT false NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  updated_at  timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_conversations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_conversations
  ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);

ALTER TABLE public.ai_conversations
  ADD CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON public.ai_conversations TO anon;

GRANT ALL ON public.ai_conversations TO authenticated;

GRANT ALL ON public.ai_conversations TO service_role;

CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations (user_id);

CREATE POLICY "Conversations user owner policy" ON public.ai_conversations
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE TABLE public.ai_discoveries (
  id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id          uuid,
  name             text                     NOT NULL,
  category         text,
  description      text,
  source_url       text,
  source_type      text,
  image_url        text,
  image_source_url text,
  discovery_reason text,
  status           text                     DEFAULT 'new'::text NOT NULL,
  created_at       timestamp with time zone DEFAULT now() NOT NULL,
  updated_at       timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_discoveries
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_discoveries
  ADD CONSTRAINT ai_discoveries_pkey PRIMARY KEY (id);

ALTER TABLE public.ai_discoveries
  ADD CONSTRAINT ai_discoveries_status_check CHECK (status = ANY (ARRAY['new'::text, 'reviewing'::text, 'saved'::text, 'rejected'::text, 'published'::text]));

ALTER TABLE public.ai_discoveries
  ADD CONSTRAINT ai_discoveries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON public.ai_discoveries TO anon;

GRANT ALL ON public.ai_discoveries TO authenticated;

GRANT ALL ON public.ai_discoveries TO service_role;

CREATE INDEX idx_ai_discoveries_status ON public.ai_discoveries (status);

CREATE INDEX idx_ai_discoveries_user_id ON public.ai_discoveries (user_id);

CREATE POLICY "Users can create own discoveries" ON public.ai_discoveries
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update own discoveries" ON public.ai_discoveries
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own discoveries" ON public.ai_discoveries
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE TABLE public.ai_messages (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid                     NOT NULL,
  role            text                     NOT NULL,
  content         text                     NOT NULL,
  tokens_used     integer                  DEFAULT 0,
  metadata        jsonb,
  created_at      timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_messages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_messages
  ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE;

ALTER TABLE public.ai_messages
  ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.ai_messages
  ADD CONSTRAINT ai_messages_role_check CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text]));

GRANT ALL ON public.ai_messages TO anon;

GRANT ALL ON public.ai_messages TO authenticated;

GRANT ALL ON public.ai_messages TO service_role;

CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages (conversation_id);

CREATE POLICY "Messages user owner policy" ON public.ai_messages
  USING ((EXISTS ( SELECT 1
   FROM public.ai_conversations
  WHERE ((ai_conversations.id = ai_messages.conversation_id) AND (ai_conversations.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.ai_conversations
  WHERE ((ai_conversations.id = ai_messages.conversation_id) AND (ai_conversations.user_id = auth.uid())))));

CREATE TABLE public.profiles (
  id                     uuid                     NOT NULL,
  display_name           text,
  email                  text,
  role                   text                     DEFAULT 'user'::text NOT NULL,
  created_at             timestamp with time zone DEFAULT now() NOT NULL,
  updated_at             timestamp with time zone DEFAULT now() NOT NULL,
  avatar_url             text,
  education_level        text,
  degree                 text,
  specialization         text,
  graduation_year        integer,
  experience_level       text,
  skills                 text[],
  programming_languages  text[],
  frameworks             text[],
  databases              text[],
  cloud_technologies     text[],
  current_learning_goals text,
  technologies_learning  text[],
  career_interests       text[],
  target_job_roles       text[],
  preferred_locations    text[],
  work_preference        text,
  github_username        text,
  github_profile_url     text,
  portfolio_url          text,
  linkedin_url           text,
  profile_completed      boolean                  DEFAULT false NOT NULL
);

ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['user'::text, 'editor'::text, 'admin'::text, 'super_admin'::text]));

GRANT ALL ON public.profiles TO anon;

GRANT ALL ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = id));

CREATE TABLE public.research_files (
  research_id uuid NOT NULL,
  file_id     uuid NOT NULL
);

ALTER TABLE public.research_files
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.research_files
  ADD CONSTRAINT research_files_pkey PRIMARY KEY (research_id, file_id);

GRANT ALL ON public.research_files TO anon;

GRANT ALL ON public.research_files TO authenticated;

GRANT ALL ON public.research_files TO service_role;

CREATE TABLE public.user_files (
  id                uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id           uuid                     NOT NULL,
  filename          text                     NOT NULL,
  title             text,
  description       text,
  mime_type         text,
  file_size         bigint,
  storage_path      text                     NOT NULL,
  category          text,
  extracted_text    text,
  extraction_status text                     DEFAULT 'pending'::text NOT NULL,
  created_at        timestamp with time zone DEFAULT now() NOT NULL,
  updated_at        timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.user_files
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_files
  ADD CONSTRAINT user_files_extraction_status_check CHECK (extraction_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text]));

ALTER TABLE public.user_files
  ADD CONSTRAINT user_files_pkey PRIMARY KEY (id);

ALTER TABLE public.research_files
  ADD CONSTRAINT research_files_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.user_files(id) ON DELETE CASCADE;

ALTER TABLE public.user_files
  ADD CONSTRAINT user_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON public.user_files TO anon;

GRANT ALL ON public.user_files TO authenticated;

GRANT ALL ON public.user_files TO service_role;

CREATE INDEX idx_user_files_user_id ON public.user_files (user_id);

CREATE POLICY "Users can create own files" ON public.user_files
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can delete own files" ON public.user_files
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can update own files" ON public.user_files
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own files" ON public.user_files
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE TABLE public.user_research (
  id                uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id           uuid                     NOT NULL,
  title             text                     NOT NULL,
  category          text,
  source_url        text,
  summary           text,
  user_notes        text,
  user_opinion      text,
  important_facts   text,
  pros              text,
  cons              text,
  pricing_info      text,
  tags              text[],
  image_url         text,
  image_source_url  text,
  image_source_type text,
  alt_text          text,
  status            text                     DEFAULT 'personal'::text NOT NULL,
  created_at        timestamp with time zone DEFAULT now() NOT NULL,
  updated_at        timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY "Users can manage own research files" ON public.research_files
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.user_research r
  WHERE ((r.id = research_files.research_id) AND (r.user_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_research r
  WHERE ((r.id = research_files.research_id) AND (r.user_id = auth.uid())))));

CREATE POLICY "Users can view own research files" ON public.research_files
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.user_research r
  WHERE ((r.id = research_files.research_id) AND (r.user_id = auth.uid())))));

ALTER TABLE public.user_research
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_research
  ADD CONSTRAINT user_research_pkey PRIMARY KEY (id);

ALTER TABLE public.research_files
  ADD CONSTRAINT research_files_research_id_fkey FOREIGN KEY (research_id) REFERENCES public.user_research(id) ON DELETE CASCADE;

ALTER TABLE public.user_research
  ADD CONSTRAINT user_research_status_check CHECK (status = ANY (ARRAY['personal'::text, 'reviewed'::text, 'published'::text]));

ALTER TABLE public.user_research
  ADD CONSTRAINT user_research_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

GRANT ALL ON public.user_research TO anon;

GRANT ALL ON public.user_research TO authenticated;

GRANT ALL ON public.user_research TO service_role;

CREATE INDEX idx_user_research_category ON public.user_research (category);

CREATE INDEX idx_user_research_user_id ON public.user_research (user_id);

CREATE POLICY "Users can create own research" ON public.user_research
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can delete own research" ON public.user_research
  FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE POLICY "Users can update own research" ON public.user_research
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view own research" ON public.user_research
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = user_id));

CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
