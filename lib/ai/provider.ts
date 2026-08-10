import type { AIProviderId } from '@/types/common';
import type { AIRequest, AIResponse } from '@/types/ai';
import { GeminiService } from '@/services/ai/gemini.service';
import { OpenAIService } from '@/services/ai/openai.service';
import { ClaudeService } from '@/services/ai/claude.service';

export interface AIProvider {
  id: AIProviderId;
  generate(request: AIRequest): Promise<AIResponse>;
}

const providers: Record<AIProviderId, AIProvider> = {
  gemini: new GeminiService(),
  openai: new OpenAIService(),
  claude: new ClaudeService(),
};

export function getProvider(id: AIProviderId = 'gemini'): AIProvider {
  const provider = providers[id];
  if (!provider) {
    return providers.gemini;
  }
  return provider;
}
