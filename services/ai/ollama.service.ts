import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { aiProviders } from '@/config/ai';

const defaultOllamaModel =
  aiProviders.find((p) => p.id === 'ollama')?.defaultModel || 'qwen3:8b';

export class OllamaService implements AIProvider {
  id = 'ollama' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const conversationId =
      request.conversation_id || (crypto.randomUUID() as any);

    const baseUrl =
      process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    const model =
      process.env.OLLAMA_MODEL || defaultOllamaModel;

    const systemInstruction =
      request.systemOverride || getSystemPrompt(request.mode);

    const endpoint = `${baseUrl}/api/chat`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: systemInstruction,
            },
            {
              role: 'user',
              content: `User Question (${request.mode}): ${request.message}`,
            },
          ],
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 2048,
          },
        }),
      });

      if (!res.ok) {
        const errorDetails = await res.text();

        throw new Error(
          `Ollama API returned status ${res.status}: ${errorDetails}`
        );
      }

      const data = await res.json();

      const text =
        data.message?.content ||
        'I could not generate a response for this request.';

      return {
        content: text,
        conversation_id: conversationId,
        tokens_used:
          data.eval_count ||
          data.prompt_eval_count ||
          0,
        provider: 'ollama',
      };
    } catch (err: any) {
      throw new Error(`Ollama Provider Error: ${err.message}`);
    }
  }
}
