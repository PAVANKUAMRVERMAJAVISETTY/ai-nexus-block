import type { AIProviderId } from '@/types/common';
import type { AIRequest, AIResponse } from '@/types/ai';

export interface AIProvider {
  id: AIProviderId;
  generate(request: AIRequest): Promise<AIResponse>;
}

export function getProvider(id: AIProviderId): AIProvider {
  // TODO: Implement provider resolution in a later stage.
  throw new Error(`AI provider "${id}" is not yet implemented.`);
}
