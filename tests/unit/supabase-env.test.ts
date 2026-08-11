import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Deployment-configuration behaviour.
 *
 * A misconfigured deployment must say so. The failure this guards against is a
 * silent fallback to a placeholder Supabase URL, where authentication simply
 * never works and nothing in the logs explains why — every user sees "please
 * sign in" forever and the operator has no thread to pull.
 *
 * `resolveSupabaseEnv` reads `process.env` at call time, so each case sets the
 * environment, imports a fresh copy of the module, and restores afterwards.
 */

const KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NODE_ENV',
] as const;

let saved: Record<string, string | undefined> = {};

async function loadFresh() {
  vi.resetModules();
  return import('@/lib/supabase/env');
}

function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete (process.env as Record<string, unknown>)[key];
    else (process.env as Record<string, unknown>)[key] = value;
  }
}

beforeEach(() => {
  saved = {};
  for (const key of KEYS) saved[key] = process.env[key];
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete (process.env as Record<string, unknown>)[key];
    else (process.env as Record<string, unknown>)[key] = saved[key];
  }
});

describe('resolveSupabaseEnv', () => {
  it('returns the configured values when both are present', async () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://real.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'real-anon-key',
      NODE_ENV: 'production',
    });

    const { resolveSupabaseEnv } = await loadFresh();
    const env = resolveSupabaseEnv();

    expect(env.url).toBe('https://real.supabase.co');
    expect(env.configured).toBe(true);
  });

  it('accepts the publishable key as an alternative to the anon key', async () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://real.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-key',
      NODE_ENV: 'production',
    });

    const { resolveSupabaseEnv } = await loadFresh();
    expect(resolveSupabaseEnv().configured).toBe(true);
  });

  /* ---------------------------------------------------------------- */
  /* The failure that matters                                          */
  /* ---------------------------------------------------------------- */

  it('throws in production, naming the variable that is missing', async () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      NODE_ENV: 'production',
    });

    const { resolveSupabaseEnv } = await loadFresh();

    // Naming the variable is the whole point — "configuration error" would
    // leave an operator guessing.
    expect(() => resolveSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => resolveSupabaseEnv()).toThrow(/not configured/i);
  });

  it('names only the variable that is actually missing', async () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://real.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      NODE_ENV: 'production',
    });

    const { resolveSupabaseEnv } = await loadFresh();

    let message = '';
    try {
      resolveSupabaseEnv();
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toMatch(/ANON_KEY/);
    expect(message).not.toMatch(/NEXT_PUBLIC_SUPABASE_URL is missing/);
  });

  // In the browser a throw white-screens the app, which is strictly worse than
  // a sign-in page that reports it cannot reach the backend.
  it('does not throw when the caller opts out, even in production', async () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      NODE_ENV: 'production',
    });

    const { resolveSupabaseEnv } = await loadFresh();
    const env = resolveSupabaseEnv({ throwInProduction: false });

    expect(env.configured).toBe(false);
  });

  it('warns but keeps rendering in development', async () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      NODE_ENV: 'development',
    });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { resolveSupabaseEnv } = await loadFresh();
    const env = resolveSupabaseEnv();

    expect(env.configured).toBe(false);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);

    warn.mockRestore();
  });

  // `configured: false` is what every caller checks before trusting the client.
  it('never reports a placeholder as configured', async () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      NODE_ENV: 'production',
    });

    const { resolveSupabaseEnv } = await loadFresh();
    const env = resolveSupabaseEnv({ throwInProduction: false });

    expect(env.url).toMatch(/placeholder/);
    expect(env.configured).toBe(false);
  });
});
