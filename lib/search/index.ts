// Search utility functions — to be implemented in a later stage.
// This module will contain full-text search helpers and query builders.

export interface SearchQuery {
  q: string;
  category?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  type: 'tool' | 'project' | 'knowledge' | 'roadmap' | 'resource' | 'journey';
  slug: string;
  score: number;
}

export function buildSearchQuery(q: string): SearchQuery {
  return { q, page: 1, limit: 20 };
}
