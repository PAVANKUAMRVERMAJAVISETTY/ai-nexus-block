import type { FeaturedEntity, Taggable, MediaLinks, SocialLinks } from './common';

export type MilestoneType = 'project' | 'learning' | 'career' | 'achievement' | 'other';

export interface JourneyEntry extends FeaturedEntity, Taggable, MediaLinks, SocialLinks {
  title: string;
  slug: string;
  description: string;
  entry_date: string;
  milestone_type: MilestoneType;
}

export interface JourneyEntryFormData {
  title: string;
  slug: string;
  description: string;
  entry_date: string;
  milestone_type: MilestoneType;
  category?: string;
  tags: string;
  image_url?: string;
  pdf_url?: string;
  sql_url?: string;
  zip_file_url?: string;
  youtube_url?: string;
  video_url?: string;
  featured: boolean;
  published: boolean;
  display_order: number;
}
