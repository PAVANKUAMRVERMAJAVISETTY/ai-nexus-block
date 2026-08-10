-- AI Nexus Block: Conversations and Messages Setup

-- 1. Create ai_conversations table
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Conversation',
  mode text not null default 'recommend_stack',
  provider text not null default 'gemini',
  is_archived boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast lookup by user_id
create index if not exists idx_ai_conversations_user_id on public.ai_conversations(user_id);

-- 2. Create ai_messages table
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tokens_used integer default 0,
  metadata jsonb default null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast message loading by conversation_id
create index if not exists idx_ai_messages_conversation_id on public.ai_messages(conversation_id);

-- 3. Enable Row Level Security
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

-- Drop existing policies if any
drop policy if exists "Conversations user owner policy" on public.ai_conversations;
drop policy if exists "Messages user owner policy" on public.ai_messages;

-- RLS Policy 1: Users can perform all operations ONLY on their own conversations
create policy "Conversations user owner policy" on public.ai_conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS Policy 2: Users can perform all operations ONLY on messages belonging to their conversations
create policy "Messages user owner policy" on public.ai_messages
  for all
  using (
    exists (
      select 1 from public.ai_conversations
      where id = ai_messages.conversation_id
      and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations
      where id = ai_messages.conversation_id
      and user_id = auth.uid()
    )
  );
