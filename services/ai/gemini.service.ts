import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { aiProviders } from '@/config/ai';

const defaultGeminiModel = aiProviders.find((p) => p.id === 'gemini')?.defaultModel || 'gemini-3.6-flash';

export class GeminiService implements AIProvider {
  id = 'gemini' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    const conversationId = request.conversation_id || (crypto.randomUUID() as any);

    if (!apiKey) {
      return {
        content:
          "⚠️ **Google Gemini API Key Missing**: Please set `GEMINI_API_KEY` in your server `.env.local` file.\n\n" +
          "**Mode Context**: " + getSystemPrompt(request.mode) + "\n\n" +
          "**Received Query**: " + request.message,
        conversation_id: conversationId,
        tokens_used: 0,
        provider: 'gemini',
      };
    }

    const systemInstruction = request.systemOverride || getSystemPrompt(request.mode);

    const model = process.env.GEMINI_MODEL || defaultGeminiModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nUser Question (${request.mode}): ${request.message}` }],
            },
          ],
          generationConfig: {
            maxOutputTokens: request.maxTokens ?? 2048,
            temperature: request.temperature ?? 0.7,
          },
        }),
      });

      if (!res.ok) {
        const errorDetails = await res.text();
        if (res.status === 404) {
          throw new Error(
            `Gemini API Model Incompatibility (HTTP 404): Model '${model}' was not found or is not supported for generateContent. Details: ${errorDetails}`
          );
        }
        throw new Error(`Gemini API returned status ${res.status}: ${errorDetails}`);
      }

      const data = await res.json();
      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'I could not generate a response for this request.';

      return {
        content: text,
        conversation_id: conversationId,
        tokens_used: data.usageMetadata?.totalTokenCount || 120,
        provider: 'gemini',
      };
    } catch (err: any) {
      throw new Error(`Gemini Provider Error: ${err.message}`);
    }
  }
}
