import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { resolveAttachmentContent } from './attachments';

export class OpenAIService implements AIProvider {
  id = 'openai' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    const conversationId =
      request.conversation_id || crypto.randomUUID();

    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    const systemInstruction =
      request.systemOverride || getSystemPrompt(request.mode);

    const resolvedAttachments = await resolveAttachmentContent(
      request.attachments ?? [],
    );

    const imageContent = resolvedAttachments
      .filter(
        (item) =>
          Boolean(item.base64) &&
          item.attachment.type === 'image' &&
          item.attachment.mime_type.startsWith('image/'),
      )
      .map((item) => ({
        type: 'image_url',
        image_url: {
          url: `data:${item.attachment.mime_type};base64,${item.base64}`,
        },
      }));

    const userContent = [
      {
        type: 'text',
        text: request.message,
      },
      ...imageContent,
    ];

    const res = await fetch(
      'https://api.openai.com/v1/chat/completions',
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
              content: userContent,
            },
          ],
          max_tokens: request.maxTokens ?? 2048,
          ...(request.temperature !== undefined
            ? { temperature: request.temperature }
            : {}),
        }),
      },
    );

    if (!res.ok) {
      const errorDetails = await res.text();
      throw new Error(
        `OpenAI API error (HTTP ${res.status}): ${errorDetails}`,
      );
    }

    const data = await res.json();

    const text =
      data.choices?.[0]?.message?.content ||
      'I could not generate a response for this request.';

    return {
      content: text,
      conversation_id: conversationId,
      tokens_used: data.usage?.total_tokens || 0,
      provider: 'openai',
    };
  }
}
