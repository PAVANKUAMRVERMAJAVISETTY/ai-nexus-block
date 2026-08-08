import type { BaseEntity, UUID, ISODateString, MessageRole, AIProviderId, AIMode } from './common';

export interface AIConversation extends BaseEntity {
  user_id: UUID;
  title: string;
  mode: AIMode;
  provider: AIProviderId;
  is_archived: boolean;
}

export interface AIMessage extends BaseEntity {
  conversation_id: UUID;
  role: MessageRole;
  content: string;
  tokens_used: number | null;
  metadata: Record<string, unknown> | null;
}

export interface AIRecommendation extends BaseEntity {
  conversation_id: UUID;
  user_id: UUID;
  query: string;
  mode: AIMode;
}

export interface AIRecommendationItem {
  id: UUID;
  recommendation_id: UUID;
  title: string;
  description: string;
  rationale: string;
  relevance_score: number;
  metadata: Record<string, unknown> | null;
}

export interface AIRequest {
  message: string;
  mode: AIMode;
  conversation_id?: UUID;
  context?: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  conversation_id: UUID;
  tokens_used: number;
  provider: AIProviderId;
}
