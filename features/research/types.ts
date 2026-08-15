import type { BaseEntity, UUID } from '@/types/common';

export interface UserResearchItem extends BaseEntity {
  user_id: UUID;
  title: string;
  category?: string | null;
  source_url?: string | null;
  url?: string | null;
  summary?: string | null;
  user_notes?: string | null;
  personal_notes?: string | null;
  user_opinion?: string | null;
  opinion?: string | null;
  important_facts?: string | null;
  pros?: string[] | string | null;
  cons?: string[] | string | null;
  pricing_info?: string | null;
  tags?: string[] | null;
  image_url?: string | null;
  image_source_url?: string | null;
  image_source_type?: string | null;
  alt_text?: string | null;
  status?: string | null;
}

export interface CreateResearchInput {
  title: string;
  category?: string;
  url?: string | null;
  source_url?: string | null;
  summary?: string | null;
  personal_notes?: string | null;
  user_notes?: string | null;
  opinion?: string | null;
  user_opinion?: string | null;
  pros?: string[];
  cons?: string[];
  pricing_info?: string | null;
  tags?: string[];
}
