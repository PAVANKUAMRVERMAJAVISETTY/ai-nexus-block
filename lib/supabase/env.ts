/**
 * Supabase environment resolution.
 *
 * Previously every client fell back to `https://placeholder.supabase.co` when
 * configuration was missing. That turns a deployment mistake into a stream of
 * confusing "please sign in" errors: auth simply never works, and nothing in
 * the logs says why. In production we now fail loudly at the point of use; in
 * development we warn once and keep the placeholder so the UI still renders.
 */

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

let warned = false;

export interface SupabaseEnv {
  url: string;
  anonKey: string;
  /** False when the placeholder is in use — auth cannot succeed. */
  configured: boolean;
}

export interface ResolveOptions {
  /**
   * Throw when configuration is missing in production. Correct on the server,
   * where a loud failure surfaces in logs. Must be `false` in the browser: a
   * thrown error there white-screens the whole app, which is strictly worse
   * than a sign-in page that reports it cannot reach the backend.
   */
  throwInProduction?: boolean;
}

export function resolveSupabaseEnv(options: ResolveOptions = {}): SupabaseEnv {
  const { throwInProduction = true } = options;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (url && anonKey) {
    return { url, anonKey, configured: true };
  }

  const missing = [
    !url && 'NEXT_PUBLIC_SUPABASE_URL',
    !anonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)',
  ]
    .filter(Boolean)
    .join(' and ');

  if (throwInProduction && process.env.NODE_ENV === 'production') {
    throw new Error(
      `Supabase is not configured: ${missing} is missing. ` +
        'Set it in the deployment environment — authentication cannot work without it.'
    );
  }

  if (!warned) {
    warned = true;
    console.warn(
      `[supabase] ${missing} is missing. Using a placeholder; sign-in will fail ` +
        'until you set it in .env.local.'
    );
  }

  return { url: PLACEHOLDER_URL, anonKey: PLACEHOLDER_KEY, configured: false };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}
