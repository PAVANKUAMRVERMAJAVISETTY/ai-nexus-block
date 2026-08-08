import type { Project } from '@/types/projects';
import type { PaginatedResponse } from '@/types/common';

// TODO: Connect to Supabase in a later stage. Returns mock data for now.

const mockProjects: Project[] = [
  {
    id: '1',
    title: 'AI Nexus Block',
    slug: 'ai-nexus-block',
    description: 'Agentic Knowledge OS & Developer Sandbox for AI tool discovery and engineering documentation.',
    long_description: 'A comprehensive platform for developers to discover AI tools, document projects, and maintain a living portfolio.',
    category: 'AI Platform',
    tags: ['nextjs', 'supabase', 'ai', 'typescript'],
    image_url: null,
    live_url: 'https://ainexusblock.com',
    github_url: 'https://github.com/ai-nexus-block',
    documentation_url: null,
    youtube_url: null,
    is_case_study: true,
    featured: true,
    published: true,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'DevRoadmap Engine',
    slug: 'devroadmap-engine',
    description: 'AI-powered learning roadmap generator for developers.',
    long_description: 'Generates personalized engineering roadmaps based on skill level and goals.',
    category: 'Education',
    tags: ['ai', 'education', 'roadmaps'],
    image_url: null,
    live_url: null,
    github_url: null,
    documentation_url: null,
    youtube_url: null,
    is_case_study: false,
    featured: true,
    published: true,
    display_order: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export function getProjects(): PaginatedResponse<Project> {
  return { data: mockProjects, total: mockProjects.length, page: 1, limit: 20, hasMore: false };
}

export function getProjectBySlug(slug: string): Project | null {
  return mockProjects.find((p) => p.slug === slug) ?? null;
}

export function getFeaturedProjects(): Project[] {
  return mockProjects.filter((p) => p.featured);
}
