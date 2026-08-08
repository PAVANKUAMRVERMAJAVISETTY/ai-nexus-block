import type { BaseEntity, UUID, ISODateString } from './common';

export interface UserProfile extends BaseEntity {
  user_id: UUID;
  full_name: string;
  display_name: string;
  role: string;
  bio: string | null;
  short_bio: string | null;
  avatar_url: string | null;
  current_mission: string | null;
  current_project: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  website_url: string | null;
  location: string | null;
  is_public: boolean;
}

export interface UserRoleRow extends BaseEntity {
  user_id: UUID;
  role: 'admin' | 'editor' | 'user';
}

export interface ProfileFormData {
  full_name: string;
  display_name: string;
  role: string;
  bio: string;
  short_bio: string;
  avatar_url: string;
  current_mission: string;
  current_project: string;
  github_url: string;
  linkedin_url: string;
  resume_url: string;
  website_url: string;
  location: string;
  is_public: boolean;
}
