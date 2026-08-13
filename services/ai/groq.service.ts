import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { getSystemPrompt } from '@/lib/ai/prompts';

export class GroqService implements AIProvider {
  id = 'groq' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    const conversationId =
      request.conversation_id || crypto.randomUUID();

    if (!apiKey) {
      throw new Error('Groq API key is not configured');
    }

    const model =
      process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const systemInstruction =
      request.systemOverride || getSystemPrompt(request.mode);

    const res = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        signal: request.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
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
              content: request.message,
            },
          ],
          max_tokens: request.maxTokens ?? 2048,
          ...(request.temperature !== undefined
            ? { temperature: request.temperature }
            : {}),
        }),
      }
    );

    if (!res.ok) {
      const errorDetails = await res.text();
      throw new Error(
        `Groq API error (HTTP ${res.status}): ${errorDetails}`
      );
    }

    const data = await res.json();

    return {
      content:
        data.choices?.[0]?.message?.content ||
        'I could not generate a response for this request.',
      conversation_id: conversationId,
      tokens_used: data.usage?.total_tokens || 0,
      provider: 'groq',
    };
  }
}

