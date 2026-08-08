import type { KnowledgeArticle } from '@/types/knowledge';
import type { PaginatedResponse } from '@/types/common';

// TODO: Connect to Supabase in a later stage. Returns mock data for now.

const mockArticles: KnowledgeArticle[] = [
  {
    id: '1',
    title: 'Understanding Agentic AI Systems',
    slug: 'understanding-agentic-ai-systems',
    excerpt: 'A deep dive into how agentic AI systems work and how to build them.',
    content: 'Full article content will be here...',
    category: 'AI Architecture',
    tags: ['ai', 'agents', 'architecture'],
    image_url: null,
    documentation_url: null,
    youtube_url: null,
    reading_time_minutes: 12,
    is_pinned: true,
    featured: true,
    published: true,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Building with pgvector and Supabase',
    slug: 'building-with-pgvector-supabase',
    excerpt: 'How to implement vector search in your Supabase project using pgvector.',
    content: 'Full article content will be here...',
    category: 'Database',
    tags: ['supabase', 'pgvector', 'database'],
    image_url: null,
    documentation_url: null,
    youtube_url: null,
    reading_time_minutes: 8,
    is_pinned: false,
    featured: true,
    published: true,
    display_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export function getKnowledgeArticles(): PaginatedResponse<KnowledgeArticle> {
  return { data: mockArticles, total: mockArticles.length, page: 1, limit: 20, hasMore: false };
}

export function getKnowledgeArticleBySlug(slug: string): KnowledgeArticle | null {
  return mockArticles.find((a) => a.slug === slug) ?? null;
}

export function getFeaturedArticles(): KnowledgeArticle[] {
  return mockArticles.filter((a) => a.featured);
}
