-- AI Nexus Block: Profiles and Role-Based Access Setup

-- 1. Create profiles table if it doesn't already exist
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  role text not null default 'user' check (role in ('user', 'super_admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast lookup by email and role
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);

-- 2. Enable Row Level Security
alter table public.profiles enable row level security;

-- Drop existing policies if any to avoid duplication errors
drop policy if exists "Profiles read policy" on public.profiles;
drop policy if exists "Profiles insert policy" on public.profiles;
drop policy if exists "Profiles update policy" on public.profiles;

-- RLS Policy 1: Users can view their own profile, super_admins can view all profiles
create policy "Profiles read policy" on public.profiles
  for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- RLS Policy 2: Users can insert their own profile during signup with role 'user'
create policy "Profiles insert policy" on public.profiles
  for insert
  with check (
    auth.uid() = id
    and (role = 'user' or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    ))
  );

-- RLS Policy 3: Users can update display_name on their own profile, only super_admins can change roles
create policy "Profiles update policy" on public.profiles
  for update
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  )
  with check (
    auth.uid() = id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- 3. Automatic Profile Creation Trigger Function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, role, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email,
    'user',
    now(),
    now()
  )
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

-- Trigger firing on auth.users row creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
