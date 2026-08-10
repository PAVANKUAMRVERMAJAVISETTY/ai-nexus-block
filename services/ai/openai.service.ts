import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { systemPrompts } from '@/lib/ai/prompts';

export class OpenAIService implements AIProvider {
  id = 'openai' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    const conversationId = request.conversation_id || (crypto.randomUUID() as any);

    if (!apiKey) {
      return {
        content:
          "⚠️ **OpenAI API Key Missing**: Please set `OPENAI_API_KEY` in your server `.env.local` file.\n\n" +
          "**Mode Context**: " + (systemPrompts[request.mode as keyof typeof systemPrompts] || systemPrompts.general) + "\n\n" +
          "**Received Query**: " + request.message,
        conversation_id: conversationId,
        tokens_used: 0,
        provider: 'openai',
      };
    }

    const systemInstruction =
      systemPrompts[request.mode as keyof typeof systemPrompts] || systemPrompts.general;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: request.message },
          ],
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errorDetails = await res.text();
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
