import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { aiProviders } from '@/config/ai';

const defaultOllamaModel = aiProviders.find((p) => p.id === 'ollama')?.defaultModel || 'llama3';

export class OllamaService implements AIProvider {
  id = 'ollama' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const host = process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const conversationId = request.conversation_id || (crypto.randomUUID() as any);
    const model = process.env.OLLAMA_MODEL || defaultOllamaModel;
    
    const systemInstruction = request.systemOverride || getSystemPrompt(request.mode);
    const endpoint = `${host}/api/generate`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
      signal: request.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: request.message,
          system: systemInstruction,
          stream: false,
          options: {
            num_predict: request.maxTokens ?? 2048,
          }
        }),
      });

      if (!res.ok) {
        const errorDetails = await res.text();
        throw new Error(`Ollama API returned status ${res.status}: ${errorDetails}`);
      }

      const data = await res.json();
      const text = data.response || 'I could not generate a local response for this request.';

      return {
        content: text,
        conversation_id: conversationId,
        tokens_used: data.eval_count || 0,
        provider: 'ollama',
      };
    } catch (error: any) {
      if (error.message.includes('fetch failed')) {
        return {
          content: 
            `⚠️ **Ollama Connection Refused**: Could not reach local model services at \`${host}\`.\n\n` +
            `**Action Required**: Make sure Ollama is launched on your machine and that \`ollama serve\` is running in the background. Check your configuration if you are utilizing a custom host string port.`,
          conversation_id: conversationId,
          tokens_used: 0,
          provider: 'ollama',
        };
      }
      throw new Error(`Ollama Service Error: ${error.message}`);
    }
  }
}
