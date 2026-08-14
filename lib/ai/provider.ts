import type { AIRequest, AIResponse } from '@/types/ai';
import type { AIProviderId } from '@/types/common';
import { GeminiService } from '@/services/ai/gemini.service';
import { OpenAIService } from '@/services/ai/openai.service';
import { ClaudeService } from '@/services/ai/claude.service';
import { OllamaService } from '@/services/ai/ollama.service';
import { GroqService } from '@/services/ai/groq.service';
import { MistralService } from '@/services/ai/mistral.service';
import { CerebrasService } from '@/services/ai/cerebras.service';
import { DeepSeekService } from '@/services/ai/deepseek.service';
import { NvidiaNimService } from '@/services/ai/nvidia.service';
import { OpenRouterService } from '@/services/ai/openrouter.service';
import { GitHubModelsService } from '@/services/ai/github-models.service';
import { CloudflareAIService } from '@/services/ai/cloudflare.service';
import { CohereService } from '@/services/ai/cohere.service';
import { HuggingFaceService } from '@/services/ai/huggingface.service';

export interface AIProvider {
  id: AIProviderId;
  generate(request: AIRequest): Promise<AIResponse>;
}

const providers: Record<AIProviderId, AIProvider> = {
  groq: new GroqService(),
  cerebras: new CerebrasService(),
  gemini: new GeminiService(),
  mistral: new MistralService(),
  deepseek: new DeepSeekService(),
  'nvidia-nim': new NvidiaNimService(),
  openrouter: new OpenRouterService(),
  'github-models': new GitHubModelsService(),
  'cloudflare-ai': new CloudflareAIService(),
  cohere: new CohereService(),
  huggingface: new HuggingFaceService(),
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
