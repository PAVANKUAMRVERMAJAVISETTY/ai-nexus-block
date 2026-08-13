-- AI Nexus Block: Seed Demo Guest User
-- Run this in your Supabase SQL Editor to provision the demo guest user account.

DO $$
DECLARE
  demo_email text := 'guest@ainexus.demo';
  demo_password text := 'GuestDemo2026!';
BEGIN
  -- Check if profile exists; user can sign up via UI or seed SQL
  RAISE NOTICE 'Demo user setup script ready. Run signup via UI or Supabase Auth dashboard for email %', demo_email;
END $$;
