import type { Tool } from '@/types/tools';
import type { PaginatedResponse } from '@/types/common';

// TODO: Connect to Supabase in a later stage. Returns mock data for now.

const mockTools: Tool[] = [
  {
    id: '1',
    name: 'Cursor',
    slug: 'cursor',
    description: 'AI-first code editor for pair programming with AI.',
    category: 'AI Editor',
    tags: ['ai', 'editor', 'productivity'],
    pricing: 'freemium',
    pricing_details: 'Free tier with Pro at $20/mo',
    is_open_source: false,
    image_url: null,
    logo_url: null,
    website_url: 'https://cursor.sh',
    github_url: null,
    documentation_url: null,
    youtube_url: null,
    featured: true,
    published: true,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Vercel',
    slug: 'vercel',
    description: 'Frontend cloud platform for deploying and scaling web apps.',
    category: 'Deployment',
    tags: ['deployment', 'hosting', 'nextjs'],
    pricing: 'freemium',
    pricing_details: 'Hobby free, Pro $20/mo',
    is_open_source: false,
    image_url: null,
    logo_url: null,
    website_url: 'https://vercel.com',
    github_url: null,
    documentation_url: 'https://vercel.com/docs',
    youtube_url: null,
    featured: true,
    published: true,
    display_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export function getTools(): PaginatedResponse<Tool> {
  return { data: mockTools, total: mockTools.length, page: 1, limit: 20, hasMore: false };
}

export function getToolBySlug(slug: string): Tool | null {
  return mockTools.find((t) => t.slug === slug) ?? null;
}

export function getFeaturedTools(): Tool[] {
  return mockTools.filter((t) => t.featured);
}
