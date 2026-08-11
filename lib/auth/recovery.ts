/**
 * Marker for a session that was established by a password-recovery link.
 *
 * Set by /auth-callback after the one-time code is exchanged, read by
 * /update-password. It is httpOnly, so only the server can create it — a page
 * script cannot forge its way past the current-password check.
 *
 * Lives in its own module because a Next.js `route.ts` may only export request
 * handlers and route config.
 */
export const RECOVERY_COOKIE = 'nexus-password-recovery';

/** Where a recovery link ultimately lands. */
export const RECOVERY_PATH = '/update-password';

/** How long the marker stays valid. Long enough to type a password, no longer. */
export const RECOVERY_MAX_AGE_SECONDS = 60 * 15;

/**
 * Reduce an untrusted `next` parameter to a same-site path, or null.
 *
 * /auth-callback establishes a real session before it redirects, so an
 * unchecked `next` would let an attacker send a freshly-authenticated user to
 * their own origin — with the session cookie already set. Only a plain
 * absolute path on this origin is allowed through.
 */
export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // Must be a single-slash absolute path. `//evil.com` and `/\evil.com` are
  // protocol-relative URLs that browsers resolve to another origin.
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;

  // `/x?y=https://evil.com` is harmless, but `/\t/evil.com` and anything
  // carrying a scheme is not worth reasoning about — reject it.
  if (raw.includes('://') || raw.includes('\\')) return null;

  // Control characters and spaces can split or smuggle a Location header.
  for (let i = 0; i < raw.length; i += 1) {
    const code = raw.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return null;
  }

  return raw;
}
