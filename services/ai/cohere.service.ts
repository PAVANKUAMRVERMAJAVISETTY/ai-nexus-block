import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { getSystemPrompt } from '@/lib/ai/prompts';

export class CohereService implements AIProvider {
  id = 'cohere' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.COHERE_API_KEY;
    const conversationId = request.conversation_id || crypto.randomUUID();

    if (!apiKey) {
      throw new Error('Cohere API key is not configured');
    }

    const model = process.env.COHERE_MODEL || 'command-r-plus';
    const systemInstruction = request.systemOverride || getSystemPrompt(request.mode);

    const res = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      signal: request.signal,
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
      }),
    });

    if (!res.ok) {
      const errorDetails = await res.text();
      throw new Error(`Cohere API error (HTTP ${res.status}): ${errorDetails}`);
    }

    const data = await res.json();
    const responseText =
      data.message?.content?.[0]?.text ||
      data.text ||
      'I could not generate a response for this request.';

    return {
      content: responseText,
      conversation_id: conversationId,
      tokens_used: data.usage?.tokens?.input_tokens + data.usage?.tokens?.output_tokens || 0,
      provider: 'cohere',
    };
  }
}
