import type { BaseEntity, UUID, ISODateString } from './common';

export type ProfileRole = 'user' | 'super_admin';

export interface Profile {
  id: string;
  display_name: string;
  email: string;
  role: ProfileRole;
  avatar_url?: string | null;
  education_level?: string | null;
  degree?: string | null;
  specialization?: string | null;
  graduation_year?: string | null;
  experience_level?: string | null;
  skills?: string[];
  target_roles?: string[];
  learning_goals?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  linkedin_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFile extends BaseEntity {
  user_id: UUID;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  category: string;
  title?: string | null;
  description?: string | null;
}

export interface UserResearch extends BaseEntity {
  user_id: UUID;
  title: string;
  category: string;
  url?: string | null;
  summary?: string | null;
  personal_notes?: string | null;
  opinion?: string | null;
  pros?: string[];
  cons?: string[];
  pricing_info?: string | null;
  tags?: string[];
  image_url?: string | null;
  image_source_url?: string | null;
  image_source_type?: string | null;
  alt_text?: string | null;
}

export interface ResearchFile extends BaseEntity {
  research_id: UUID;
  file_id: UUID;
}

export interface AIDiscovery extends BaseEntity {
  detected_by_user_id?: UUID | null;
  name: string;
  category: string;
  source_url?: string | null;
  reason_detected?: string | null;
  image_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AgentChangeRequest extends BaseEntity {
  requested_by: UUID;
  action_type: string;
  target_type: string;
  target_id?: UUID | null;
  title: string;
  proposed_change: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'failed';
  approved_by?: UUID | null;
  approved_at?: ISODateString | null;
  result?: string | null;
  error_message?: string | null;
}
