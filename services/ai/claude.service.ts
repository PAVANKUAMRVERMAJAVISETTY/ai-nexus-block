import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';

// TODO: Implement Anthropic Claude API integration in a later stage.
export class ClaudeService implements AIProvider {
  id = 'claude' as const;

  async generate(_request: AIRequest): Promise<AIResponse> {
    throw new Error('ClaudeService is not yet implemented.');
  }
}
