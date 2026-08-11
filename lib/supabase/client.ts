import { createBrowserClient } from '@supabase/ssr';
import { resolveSupabaseEnv } from './env';

// Browser-side: never throw on missing configuration. A thrown error here
// white-screens the entire app; a warning plus a failing sign-in is far more
// diagnosable. The server and middleware still fail loudly.
const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveSupabaseEnv({
  throwInProduction: false,
});

export function createSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
