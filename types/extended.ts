import type { FeaturedEntity, Taggable, Categorizable, MediaLinks, SocialLinks } from './common';

export interface Resource extends FeaturedEntity, Taggable, Categorizable, MediaLinks, SocialLinks {
  title: string;
  slug: string;
  description: string;
  resource_type: 'article' | 'video' | 'book' | 'course' | 'tool' | 'repository' | 'other';
}

export interface ResourceFormData {
  title: string;
  slug: string;
  description: string;
  category: string;
  tags: string;
  resource_type: Resource['resource_type'];
  image_url: string;
  website_url: string;
  github_url: string;
  documentation_url: string;
  youtube_url: string;
  featured: boolean;
  published: boolean;
  display_order: number;
}

export interface JourneyEntry extends FeaturedEntity, Taggable, MediaLinks {
  title: string;
  slug: string;
  description: string;
  entry_date: string;
  milestone_type: 'project' | 'learning' | 'career' | 'achievement' | 'other';
}

export interface JourneyEntryFormData {
  title: string;
  slug: string;
  description: string;
  entry_date: string;
  milestone_type: JourneyEntry['milestone_type'];
  tags: string;
  image_url: string;
  featured: boolean;
  published: boolean;
  display_order: number;
}

export interface EngineeringDecision extends FeaturedEntity, Taggable {
  title: string;
  slug: string;
  context: string;
  decision: string;
  rationale: string;
  alternatives: string | null;
  consequences: string | null;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
}

export interface EngineeringDecisionFormData {
  title: string;
  slug: string;
  context: string;
  decision: string;
  rationale: string;
  alternatives: string;
  consequences: string;
  status: EngineeringDecision['status'];
  tags: string;
  featured: boolean;
  published: boolean;
  display_order: number;
}

export interface DebugSession extends FeaturedEntity {
  user_id: string;
  title: string;
  problem: string;
  code_snippet: string | null;
  solution: string | null;
  language: string | null;
  status: 'active' | 'resolved' | 'unresolved';
}

export interface Note extends FeaturedEntity, Taggable {
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
}

export interface MediaAsset extends FeaturedEntity {
  user_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  bucket: string;
  alt_text: string | null;
}

export interface MediaAssetFormData {
  file_name: string;
  alt_text: string;
  bucket: string;
}

export interface PageView {
  id: string;
  path: string;
  visitor_id: string;
  viewed_at: string;
  referrer: string | null;
  user_agent: string | null;
}
