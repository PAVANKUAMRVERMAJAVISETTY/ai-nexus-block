import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';

// TODO: Implement Google Gemini API integration in a later stage.
export class GeminiService implements AIProvider {
  id = 'gemini' as const;

  async generate(_request: AIRequest): Promise<AIResponse> {
    throw new Error('GeminiService is not yet implemented.');
  }
}
