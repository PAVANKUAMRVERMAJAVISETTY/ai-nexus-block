import type { FeaturedEntity, Taggable, Categorizable, MediaLinks } from './common';

export interface RoadmapStep {
  id: string;
  roadmap_id: string;
  title: string;
  description: string | null;
  order: number;
  resources: string[] | null;
}

export interface Roadmap extends FeaturedEntity, Taggable, Categorizable, MediaLinks {
  title: string;
  slug: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number | null;
}

export interface RoadmapFormData {
  title: string;
  slug: string;
  description: string;
  category: string;
  tags: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  image_url: string;
  featured: boolean;
  published: boolean;
  display_order: number;
}
