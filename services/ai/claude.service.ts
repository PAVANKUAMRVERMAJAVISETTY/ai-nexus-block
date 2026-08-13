import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { aiProviders } from '@/config/ai';

export class ClaudeService implements AIProvider {
  id = 'claude' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const conversationId = request.conversation_id || (crypto.randomUUID() as any);

    if (!apiKey) {
      return {
        content:
          "⚠️ **Anthropic Claude API Key Missing**: Please set `ANTHROPIC_API_KEY` in your server `.env.local` file.\n\n" +
          "**Mode Context**: " + getSystemPrompt(request.mode) + "\n\n" +
          "**Received Query**: " + request.message,
        conversation_id: conversationId,
        tokens_used: 0,
        provider: 'claude',
      };
    }

    const systemInstruction = request.systemOverride || getSystemPrompt(request.mode);
    const model =
      process.env.ANTHROPIC_MODEL ||
      aiProviders.find((p) => p.id === 'claude')?.defaultModel ||
      'claude-sonnet-4-5';

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          system: systemInstruction,
          messages: [{ role: 'user', content: request.message }],
          max_tokens: request.maxTokens ?? 2048,
        }),
      });

      if (!res.ok) {
        const errorDetails = await res.text();
        if (res.status === 403 || res.status === 401) {
          return {
            content:
              `⚠️ **Anthropic Claude API Key Error (HTTP ${res.status})**: Your \`ANTHROPIC_API_KEY\` in \`.env.local\` was rejected by Anthropic API.\n\n` +
              `**Action Required**: Please update \`ANTHROPIC_API_KEY\` in your server \`.env.local\` file with a valid Anthropic API key.`,
            conversation_id: conversationId,
            tokens_used: 0,
            provider: 'claude',
          };
        }
        throw new Error(`Anthropic Claude API returned status ${res.status}: ${errorDetails}`);
      }

      const data = await res.json();
      const text = data.content?.[0]?.text || 'No response generated from Claude.';

      return {
        content: text,
        conversation_id: conversationId,
        tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) || 160,
        provider: 'claude',
      };
    } catch (err: any) {
      throw new Error(`Claude Provider Error: ${err.message}`);
    }
  }
}
