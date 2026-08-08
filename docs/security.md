# Security

## Authentication

- Uses Supabase Auth (email/password)
- No passwords stored manually in the database
- Email confirmation stays OFF during development
- Session management via Supabase SSR client

## Authorization

- Role-based access control via `user_roles` table
- Roles: `admin`, `editor`, `user`
- Admin routes protected by middleware (planned)
- RLS policies enforce row-level access

## RLS Policies

- Enabled on all tables
- Public read for published content
- Ownership checks using `auth.uid()`
- Never use `current_user` — always `auth.uid()`
- Four separate policies per table (SELECT, INSERT, UPDATE, DELETE)
- Never use `FOR ALL` policies

## API Security

- Input validation at all API boundaries
- Rate limiting (planned)
- Sanitization of user input
- No secrets in source code
- API keys stored as environment variables only

## Data Safety

- Never DROP tables or DELETE columns
- Never change column types or rename tables without migration
- Supabase Storage buckets with appropriate access policies
