import type { AIRequest, AIResponse } from '@/types/ai';
import type { AIProviderId } from '@/types/common';
import { GeminiService } from '@/services/ai/gemini.service';
import { OpenAIService } from '@/services/ai/openai.service';
import { ClaudeService } from '@/services/ai/claude.service';
import { OllamaService } from '@/services/ai/ollama.service';
import { GroqService } from '@/services/ai/groq.service';
import { MistralService } from '@/services/ai/mistral.service';

export interface AIProvider {
  id: AIProviderId;
  generate(request: AIRequest): Promise<AIResponse>;
}

const providers: Record<AIProviderId, AIProvider> = {
  gemini: new GeminiService(),
  groq: new GroqService(),
  mistral: new MistralService(),
  openai: new OpenAIService(),
  claude: new ClaudeService(),
  ollama: new OllamaService(),
};

export function getProvider(providerId: AIProviderId): AIProvider {
  const provider = providers[providerId];

  if (!provider) {
    throw new Error(`AI provider "${providerId}" is not registered`);
  }

  return provider;
}

export { providers };
