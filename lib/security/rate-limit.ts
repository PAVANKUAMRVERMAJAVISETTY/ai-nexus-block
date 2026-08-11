/**
 * Request rate limiting.
 *
 * Previously `rateLimited()` returned `false` unconditionally, so a single
 * signed-in user could issue unlimited AI requests — the fastest way to burn
 * an API budget once the site has real traffic.
 *
 * SCOPE AND HONESTY: this is an in-memory fixed-window limiter. It protects a
 * single server instance. On a platform that runs several instances or scales
 * functions horizontally, each instance keeps its own counter, so the effective
 * limit is `limit × instances`. That is a large improvement over no limit at
 * all and needs no extra infrastructure, but it is not a distributed limiter.
 * For a hard global cap, back `hit()` with Redis or Postgres — the call sites
 * do not change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Stop the map growing without bound on a long-lived server. */
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number): void {
  for (const [key, bucket] of Array.from(buckets.entries())) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  // If pressure remains after expiry (an active flood of distinct keys), drop
  // the oldest entries rather than letting memory grow indefinitely.
  if (buckets.size > MAX_TRACKED_KEYS) {
    const sorted = Array.from(buckets.entries()).sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (const [key] of sorted.slice(0, buckets.size - MAX_TRACKED_KEYS)) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitRule {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix ms at which the window resets. */
  resetAt: number;
  /** Seconds to wait, for the Retry-After header. */
  retryAfterSeconds: number;
}

/** Tuned per surface: model calls are expensive, ordinary writes are not. */
export const RATE_LIMITS = {
  /** AI generation — the costly path. */
  ai: { limit: 20, windowMs: 60_000 },
  /** Queuing a command for the local agent. */
  run: { limit: 30, windowMs: 60_000 },
  /** File writes and other authenticated mutations. */
  write: { limit: 120, windowMs: 60_000 },
  /** Unauthenticated endpoints, keyed by IP. */
  anonymous: { limit: 30, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Record a request against `key` and report whether it is allowed.
 * Fixed window: simple, predictable, and adequate for abuse control.
 */
export function hit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();

  // Amortized cleanup — cheap, and avoids a background timer.
  if (buckets.size > 64 && Math.floor(now / 1000) % 30 === 0) sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + rule.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      limit: rule.limit,
      remaining: rule.limit - 1,
      resetAt,
      retryAfterSeconds: Math.ceil(rule.windowMs / 1000),
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, rule.limit - existing.count);

  return {
    allowed: existing.count <= rule.limit,
    limit: rule.limit,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * Best-effort client IP, for unauthenticated endpoints.
 * Only meaningful behind a proxy that sets these headers (Netlify does);
 * a user id is always preferred where one exists.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return (
    request.headers.get('x-nf-client-connection-ip') ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

/** Standard rate-limit headers, so clients can back off intelligently. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed ? {} : { 'Retry-After': String(result.retryAfterSeconds) }),
  };
}

/** Test-only: clear all counters. */
export function __resetRateLimits(): void {
  buckets.clear();
}
