import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { systemPrompts } from '@/lib/ai/prompts';

export class ClaudeService implements AIProvider {
  id = 'claude' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const conversationId = request.conversation_id || (crypto.randomUUID() as any);

    if (!apiKey) {
      return {
        content:
          "⚠️ **Anthropic Claude API Key Missing**: Please set `ANTHROPIC_API_KEY` in your server `.env.local` file.\n\n" +
          "**Mode Context**: " + (systemPrompts[request.mode as keyof typeof systemPrompts] || systemPrompts.general) + "\n\n" +
          "**Received Query**: " + request.message,
        conversation_id: conversationId,
        tokens_used: 0,
        provider: 'claude',
      };
    }

    const systemInstruction =
      systemPrompts[request.mode as keyof typeof systemPrompts] || systemPrompts.general;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20240620',
          system: systemInstruction,
          messages: [{ role: 'user', content: request.message }],
          max_tokens: 2048,
        }),
      });

      if (!res.ok) {
        const errorDetails = await res.text();
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
