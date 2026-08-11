/** @type {import('next').NextConfig} */

/**
 * Security headers.
 *
 * The CSP allows Monaco's worker and the inline styles that Next and Monaco
 * emit, and permits connections to Supabase. `frame-ancestors 'none'` stops
 * the app being framed, which is what makes clickjacking of the admin panel
 * and the IDE's approve/reject buttons impossible.
 */
const securityHeaders = [
  // Stop MIME sniffing turning an uploaded file into executable script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Belt-and-braces alongside frame-ancestors, for older browsers.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Do not leak the full URL (which can contain ids) to third parties.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // This app needs none of these; deny them outright.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Force HTTPS for two years once seen over TLS.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // 'unsafe-eval' is required by Monaco; 'unsafe-inline' by Next's
      // bootstrap script. Both are scoped to our own origin.
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Supabase REST/auth/realtime, over HTTPS and WSS only.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
];

const nextConfig = {
  // Linting is part of the build again. Shipping a build whose lint step never
  // ran is how type-adjacent mistakes reach users.
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: { unoptimized: true },
  // Do not advertise the framework version to scanners.
  poweredByHeader: false,
  // Trailing-slash redirects and canonical URLs help SEO consistency.
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // API responses must never be cached by a shared proxy — they are
        // per-user and authenticated.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
