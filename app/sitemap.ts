import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { publicNav } from '@/config/navigation';
import { getKnowledgeArticles } from '@/services/knowledge';
import { getTools } from '@/services/tools';
import { getProjects } from '@/services/projects';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url
  ).replace(/\/$/, '');

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...publicNav.map((item) => ({
      url: `${baseUrl}${item.href}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];

  const detailRoutes: MetadataRoute.Sitemap = [];

  try {
    const { data: articles } = await getKnowledgeArticles();

    for (const article of articles) {
      detailRoutes.push({
        url: `${baseUrl}/knowledge/${article.slug}`,
        lastModified: article.updated_at
          ? new Date(article.updated_at)
          : now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // Keep sitemap generation resilient.
  }

  try {
    const { data: tools } = await getTools();

    for (const tool of tools) {
      detailRoutes.push({
        url: `${baseUrl}/tools/${tool.slug}`,
        lastModified: tool.updated_at
          ? new Date(tool.updated_at)
          : now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // Keep sitemap generation resilient.
  }

  try {
    const { data: projects } = await getProjects();

    for (const project of projects) {
      detailRoutes.push({
        url: `${baseUrl}/projects/${project.slug}`,
        lastModified: project.updated_at
          ? new Date(project.updated_at)
          : now,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  } catch {
    // Keep sitemap generation resilient.
  }

  return [...staticRoutes, ...detailRoutes];
}
