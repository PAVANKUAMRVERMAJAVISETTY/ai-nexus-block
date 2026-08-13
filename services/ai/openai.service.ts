import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { aiProviders } from '@/config/ai';

export class OpenAIService implements AIProvider {
  id = 'openai' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    const conversationId = request.conversation_id || (crypto.randomUUID() as any);

    if (!apiKey) {
      return {
        content:
          "⚠️ **OpenAI API Key Missing**: Please set `OPENAI_API_KEY` in your server `.env.local` file.\n\n" +
          "**Mode Context**: " + getSystemPrompt(request.mode) + "\n\n" +
          "**Received Query**: " + request.message,
        conversation_id: conversationId,
        tokens_used: 0,
        provider: 'openai',
      };
    }

    const systemInstruction = request.systemOverride || getSystemPrompt(request.mode);
    const model =
      process.env.OPENAI_MODEL ||
      aiProviders.find((p) => p.id === 'openai')?.defaultModel ||
      'gpt-4o';

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: request.message },
          ],
          max_tokens: request.maxTokens ?? 2048,
          temperature: request.temperature ?? 0.7,
        }),
      });

      if (!res.ok) {
        const errorDetails = await res.text();
        if (res.status === 403 || res.status === 401) {
          return {
            content:
              `⚠️ **OpenAI API Key Error (HTTP ${res.status})**: Your \`OPENAI_API_KEY\` in \`.env.local\` was rejected by OpenAI API.\n\n` +
              `**Action Required**: Please update \`OPENAI_API_KEY\` in your server \`.env.local\` file with a valid OpenAI API key.`,
            conversation_id: conversationId,
            tokens_used: 0,
            provider: 'openai',
          };
        }
        throw new Error(`OpenAI API returned status ${res.status}: ${errorDetails}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || 'No response generated from OpenAI.';

      return {
        content: text,
        conversation_id: conversationId,
        tokens_used: data.usage?.total_tokens || 150,
        provider: 'openai',
      };
    } catch (err: any) {
      throw new Error(`OpenAI Provider Error: ${err.message}`);
    }
  }
}
