import type { FeaturedEntity, Taggable, Categorizable, MediaLinks, SocialLinks } from './common';

export interface ProjectTechnology {
  id: string;
  project_id: string;
  technology: string;
}

export interface ProjectChallenge {
  id: string;
  project_id: string;
  challenge: string;
  solution: string;
}

export interface Project extends FeaturedEntity, Taggable, Categorizable, MediaLinks, SocialLinks {
  title: string;
  slug: string;
  description: string;
  long_description: string | null;
  live_url: string | null;
  is_case_study: boolean;
}

export interface ProjectFormData {
  title: string;
  slug: string;
  description: string;
  long_description: string;
  category: string;
  tags: string;
  image_url: string;
  live_url: string;
  github_url: string;
  documentation_url: string;
  youtube_url: string;
  is_case_study: boolean;
  featured: boolean;
  published: boolean;
  display_order: number;
}
