-- AI Nexus Block: fix and harden Row Level Security on public.profiles
--
-- Two defects in 20260809000000_auth_profiles.sql are corrected here.
--
-- 1. INFINITE RECURSION (breaks the application outright)
--    The policies on public.profiles decide access by running
--    `select 1 from public.profiles ...`. That inner select is itself subject
--    to the same policy, so PostgreSQL aborts with
--        ERROR: infinite recursion detected in policy for relation "profiles"
--    for EVERY statement against the table by a non-superuser — select, insert
--    and update alike. Login role lookup, the middleware admin check, the
--    profile page and the admin user list all read this table, so applying the
--    original migration unchanged takes the whole application down.
--
--    The fix is a SECURITY DEFINER helper. It executes as the function owner,
--    which is exempt from RLS, so the admin check no longer re-enters the
--    policy. Its search_path is pinned so the owner's privileges cannot be
--    borrowed by shadowing `profiles` with another schema.
--
-- 2. PRIVILEGE ESCALATION
--    The UPDATE policy's WITH CHECK only required `auth.uid() = id`. Nothing
--    constrained the `role` column, so a signed-in user could send
--        update profiles set role = 'super_admin' where id = <their own id>
--    straight to PostgREST with the public anon key and become an admin. The
--    API route at app/api/profile/route.ts strips `role` from its payload, but
--    the browser does not have to use that route — the anon key is public by
--    design and PostgREST is directly reachable.
--
--    Fixed in two independent layers: the UPDATE policy now pins the role for
--    self-updates, and a BEFORE UPDATE trigger rejects any role change from a
--    caller that is not a super admin. The trigger is authoritative because it
--    compares OLD to NEW directly, and it also covers any future policy edit
--    that loosens the WITH CHECK by accident.

-- ---------------------------------------------------------------------------
-- 1. Non-recursive admin check
-- ---------------------------------------------------------------------------

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

comment on function public.is_super_admin() is
  'True when the current JWT subject is a super_admin. SECURITY DEFINER so it '
  'does not re-enter the RLS policies on public.profiles, which would recurse.';

revoke execute on function public.is_super_admin() from public;
-- `anon` must be included: the policies call this function on every request,
-- including unauthenticated ones. Without the grant, an anonymous read raises
-- "permission denied for function is_super_admin" instead of simply returning
-- no rows. For an anonymous caller auth.uid() is null, so it returns false.
grant execute on function public.is_super_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Replace the recursive policies
-- ---------------------------------------------------------------------------

drop policy if exists "Profiles read policy" on public.profiles;
drop policy if exists "Profiles insert policy" on public.profiles;
drop policy if exists "Profiles update policy" on public.profiles;

-- Read: your own row, or every row if you are a super admin.
create policy "Profiles read policy" on public.profiles
  for select
  using (
    auth.uid() = id
    or public.is_super_admin()
  );

-- Insert: only your own row, and only as a plain user. A super admin may
-- create a row with any role.
create policy "Profiles insert policy" on public.profiles
  for insert
  with check (
    (auth.uid() = id and role = 'user')
    or public.is_super_admin()
  );

-- Update: your own row, or any row if you are a super admin.
create policy "Profiles update policy" on public.profiles
  for update
  using (
    auth.uid() = id
    or public.is_super_admin()
  )
  with check (
    auth.uid() = id
    or public.is_super_admin()
  );

-- No DELETE policy: with RLS enabled and no policy, deletes are refused for
-- everyone except the service role. Account deletion belongs to Supabase Auth,
-- which cascades to this table through the foreign key.

-- ---------------------------------------------------------------------------
-- 3. Make the role column immutable to its owner
-- ---------------------------------------------------------------------------

create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- auth.uid() is null on the server-side service-role path, which already
    -- requires the secret key and is trusted. Any request carrying a JWT must
    -- belong to a super admin.
    if auth.uid() is not null and not public.is_super_admin() then
      raise exception 'Only a super admin can change a profile role'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.enforce_profile_role_change() is
  'Blocks self-service privilege escalation: a user cannot raise their own '
  'role by writing to public.profiles directly through PostgREST.';

drop trigger if exists enforce_profile_role_change on public.profiles;

create trigger enforce_profile_role_change
  before update on public.profiles
  for each row
  execute function public.enforce_profile_role_change();
