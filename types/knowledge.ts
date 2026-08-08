import type { FeaturedEntity, Taggable, Categorizable, MediaLinks, SocialLinks } from './common';

export interface KnowledgeCategory extends FeaturedEntity {
  name: string;
  slug: string;
  description: string | null;
}

export interface KnowledgeArticle extends FeaturedEntity, Taggable, Categorizable, MediaLinks, SocialLinks {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  reading_time_minutes: number | null;
  is_pinned: boolean;
}

export interface KnowledgeArticleFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  image_url: string;
  documentation_url: string;
  youtube_url: string;
  reading_time_minutes: number;
  is_pinned: boolean;
  featured: boolean;
  published: boolean;
  display_order: number;
}
