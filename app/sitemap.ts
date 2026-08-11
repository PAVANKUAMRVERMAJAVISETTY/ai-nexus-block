import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { publicNav } from '@/config/navigation';
import { getKnowledgeArticles } from '@/services/knowledge';
import { getTools } from '@/services/tools';
import { getProjects } from '@/services/projects';

/**
 * Serves /sitemap.xml.
 *
 * Built from the same sources the public pages render from, so it cannot drift
 * out of sync with what actually exists. Only public routes appear —
 * authenticated areas are excluded here and in robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/$/, '');
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    ...publicNav.map((item) => ({
      url: `${baseUrl}${item.href}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];

  // Detail pages. Wrapped so a content-source failure degrades the sitemap
  // rather than failing the whole build.
  const detailRoutes: MetadataRoute.Sitemap = [];

  try {
    for (const article of getKnowledgeArticles().data) {
      detailRoutes.push({
        url: `${baseUrl}/knowledge/${article.slug}`,
        lastModified: article.updated_at ? new Date(article.updated_at) : now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // Content source unavailable at build time — omit these entries.
  }

  try {
    for (const tool of getTools().data) {
      detailRoutes.push({
        url: `${baseUrl}/tools/${tool.slug}`,
        lastModified: tool.updated_at ? new Date(tool.updated_at) : now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // Content source unavailable at build time — omit these entries.
  }

  try {
    for (const project of getProjects().data) {
      detailRoutes.push({
        url: `${baseUrl}/projects/${project.slug}`,
        lastModified: project.updated_at ? new Date(project.updated_at) : now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // Content source unavailable at build time — omit these entries.
  }

  return [...staticRoutes, ...detailRoutes];
}
