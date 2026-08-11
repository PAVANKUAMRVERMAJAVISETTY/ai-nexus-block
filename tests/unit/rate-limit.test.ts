import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RATE_LIMITS,
  __resetRateLimits,
  clientIp,
  hit,
  rateLimitHeaders,
} from '@/lib/security/rate-limit';

beforeEach(() => {
  __resetRateLimits();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('hit', () => {
  const rule = { limit: 3, windowMs: 60_000 };

  it('allows requests up to the limit and blocks beyond it', () => {
    expect(hit('u1', rule).allowed).toBe(true);
    expect(hit('u1', rule).allowed).toBe(true);
    expect(hit('u1', rule).allowed).toBe(true);
    // Fourth request in the window is rejected.
    expect(hit('u1', rule).allowed).toBe(false);
    expect(hit('u1', rule).allowed).toBe(false);
  });

  it('counts down remaining accurately', () => {
    expect(hit('u1', rule).remaining).toBe(2);
    expect(hit('u1', rule).remaining).toBe(1);
    expect(hit('u1', rule).remaining).toBe(0);
    // Never goes negative, however many extra requests arrive.
    expect(hit('u1', rule).remaining).toBe(0);
  });

  // The whole point: one user's usage must not affect another's.
  it('isolates buckets per key', () => {
    hit('user-a', rule);
    hit('user-a', rule);
    hit('user-a', rule);
    expect(hit('user-a', rule).allowed).toBe(false);

    expect(hit('user-b', rule).allowed).toBe(true);
    expect(hit('user-b', rule).remaining).toBe(1);
  });

  it('resets after the window elapses', () => {
    hit('u1', rule);
    hit('u1', rule);
    hit('u1', rule);
    expect(hit('u1', rule).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    const afterReset = hit('u1', rule);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(2);
  });

  it('does not reset early', () => {
    hit('u1', rule);
    hit('u1', rule);
    hit('u1', rule);

    vi.advanceTimersByTime(59_000);
    expect(hit('u1', rule).allowed).toBe(false);
  });

  it('reports a sensible retry-after', () => {
    hit('u1', rule);
    vi.advanceTimersByTime(30_000);
    hit('u1', rule);
    hit('u1', rule);

    const blocked = hit('u1', rule);
    expect(blocked.allowed).toBe(false);
    // ~30s left in the window, never zero.
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(30);
  });
});

describe('configured limits', () => {
  it('keeps the expensive AI path tighter than ordinary writes', () => {
    expect(RATE_LIMITS.ai.limit).toBeLessThan(RATE_LIMITS.write.limit);
    for (const rule of Object.values(RATE_LIMITS)) {
      expect(rule.limit).toBeGreaterThan(0);
      expect(rule.windowMs).toBeGreaterThan(0);
    }
  });
});

describe('rateLimitHeaders', () => {
  it('emits standard headers, with Retry-After only when blocked', () => {
    const rule = { limit: 1, windowMs: 60_000 };

    const ok = rateLimitHeaders(hit('u1', rule));
    expect(ok['X-RateLimit-Limit']).toBe('1');
    expect(ok['X-RateLimit-Remaining']).toBe('0');
    expect(ok['Retry-After']).toBeUndefined();

    const blocked = rateLimitHeaders(hit('u1', rule));
    expect(blocked['Retry-After']).toBeDefined();
  });
});

describe('clientIp', () => {
  it('prefers the first x-forwarded-for entry', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.7, 70.41.3.18' },
    });
    expect(clientIp(request)).toBe('203.0.113.7');
  });

  it('falls back through platform headers', () => {
    expect(
      clientIp(new Request('https://example.com', { headers: { 'x-real-ip': '198.51.100.4' } }))
    ).toBe('198.51.100.4');

    expect(clientIp(new Request('https://example.com'))).toBe('unknown');
  });
});
