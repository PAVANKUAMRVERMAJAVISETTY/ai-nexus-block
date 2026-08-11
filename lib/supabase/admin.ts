import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client.
 *
 * SECURITY: this client bypasses Row Level Security. It exists for exactly one
 * reason — the Nexus Local Development Agent authenticates with a device token
 * rather than a Supabase user session, so its requests carry no JWT for RLS to
 * evaluate. Every caller MUST verify the device token first and then scope every
 * query by the `user_id` that the token resolves to.
 *
 * Rules:
 *   - never import this module from a client component
 *   - never return raw rows fetched with it to an unauthenticated caller
 *   - never use it to serve a browser request that has a user session; use
 *     `createSupabaseServerClient()` for those so RLS stays in force
 */

let cached: SupabaseClient | null = null;

export function isServiceRoleConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

export class ServiceRoleUnavailableError extends Error {
  constructor() {
    super(
      'SUPABASE_SERVICE_ROLE_KEY is not configured on the server. ' +
        'The Nexus Local Development Agent cannot be used until it is set.'
    );
    this.name = 'ServiceRoleUnavailableError';
  }
}

export function createSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('createSupabaseAdminClient() must never run in the browser.');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new ServiceRoleUnavailableError();
  }

  if (!cached) {
    cached = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return cached;
}
