import type { FeaturedEntity, Taggable, Categorizable, MediaLinks, SocialLinks, PricingModel } from './common';

export interface ToolCategory extends FeaturedEntity {
  name: string;
  slug: string;
  description: string | null;
}

export interface ToolFeature {
  id: string;
  tool_id: string;
  feature: string;
  description: string | null;
}

export interface ToolProsCons {
  id: string;
  tool_id: string;
  type: 'pro' | 'con';
  text: string;
}

export interface ToolStackCompatibility {
  id: string;
  tool_id: string;
  technology: string;
  compatibility: 'full' | 'partial' | 'none';
}

export interface Tool extends FeaturedEntity, Taggable, Categorizable, MediaLinks, SocialLinks {
  name: string;
  slug: string;
  description: string;
  pricing: PricingModel;
  pricing_details: string | null;
  is_open_source: boolean;
}

export interface ToolFormData {
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string;
  pricing: PricingModel;
  pricing_details: string;
  image_url: string;
  logo_url: string;
  website_url: string;
  github_url: string;
  documentation_url: string;
  youtube_url: string;
  is_open_source: boolean;
  featured: boolean;
  published: boolean;
  display_order: number;
}
