export type UUID = string;
export type ISODateString = string;
export type Slug = string;

export type ContentStatus = 'draft' | 'published' | 'archived';

export interface BaseEntity {
  id: UUID;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface FeaturedEntity extends BaseEntity {
  featured: boolean;
  published: boolean;
  display_order: number;
}

export interface Taggable {
  tags: string[];
}

export interface Categorizable {
  category: string;
}

export interface MediaLinks {
  image_url?: string | null;
  logo_url?: string | null;
}

export interface SocialLinks {
  website_url?: string | null;
  github_url?: string | null;
  documentation_url?: string | null;
  youtube_url?: string | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type AIProviderId = 'gemini' | 'openai' | 'claude' | 'ollama';

export type AIMode =
  | 'recommend_stack'
  | 'debug_problem'
  | 'compare_tools'
  | 'plan_project'
  | 'learn_concept'
  | 'general';

export type MessageRole = 'user' | 'assistant' | 'system';

export type PricingModel = 'free' | 'freemium' | 'paid' | 'enterprise';
