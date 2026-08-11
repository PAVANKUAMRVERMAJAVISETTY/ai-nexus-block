import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/**
 * Serves /robots.txt.
 *
 * Authenticated areas are disallowed: they return a redirect to unauthenticated
 * crawlers anyway, so indexing them wastes crawl budget and risks surfacing
 * empty shells in search results.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard',
          '/ide',
          '/assistant',
          '/conversations',
          '/profile',
          '/files',
          '/research',
          '/notes',
          '/debug',
          '/decisions',
          '/auth-callback',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
