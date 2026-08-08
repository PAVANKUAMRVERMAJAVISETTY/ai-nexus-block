import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';

// TODO: Implement OpenAI API integration in a later stage.
export class OpenAIService implements AIProvider {
  id = 'openai' as const;

  async generate(_request: AIRequest): Promise<AIResponse> {
    throw new Error('OpenAIService is not yet implemented.');
  }
}
