import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { getSystemPrompt } from '@/lib/ai/prompts';

export class CloudflareAIService implements AIProvider {
  id = 'cloudflare-ai' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.CLOUDFLARE_AI_API_KEY || process.env.CLOUDFLARE_API_KEY;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const conversationId = request.conversation_id || crypto.randomUUID();

    if (!apiKey) {
      throw new Error('Cloudflare AI API key is not configured');
    }

    const model = process.env.CLOUDFLARE_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct';
    const systemInstruction = request.systemOverride || getSystemPrompt(request.mode);

    const endpoint = accountId
      ? `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`
      : `https://api.cloudflare.com/client/v4/ai/run/${model}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      signal: request.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: request.message },
        ],
        max_tokens: request.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      const errorDetails = await res.text();
      throw new Error(`Cloudflare AI API error (HTTP ${res.status}): ${errorDetails}`);
    }

    const data = await res.json();
    const resultText =
      data.result?.response ||
      data.result?.choices?.[0]?.message?.content ||
      (typeof data.result === 'string' ? data.result : '') ||
      'I could not generate a response for this request.';

    return {
      content: resultText,
      conversation_id: conversationId,
      tokens_used: data.result?.usage?.total_tokens || 0,
      provider: 'cloudflare-ai',
    };
  }
}
