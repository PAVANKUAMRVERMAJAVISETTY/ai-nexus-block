import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { resolveAttachmentContent } from './attachments';

export class ClaudeService implements AIProvider {
  id = 'claude' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const conversationId =
      request.conversation_id || crypto.randomUUID();

    if (!apiKey) {
      throw new Error('Claude API key is not configured');
    }

    const model =
      process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet';

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
        type: 'image',
        source: {
          type: 'base64',
          media_type: item.attachment.mime_type,
          data: item.base64,
        },
      }));

    const res = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        signal: request.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: request.maxTokens ?? 2048,
          system: systemInstruction,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: request.message,
                },
                ...imageContent,
              ],
            },
          ],
          ...(request.temperature !== undefined
            ? { temperature: request.temperature }
            : {}),
        }),
      },
    );

    if (!res.ok) {
      const errorDetails = await res.text();
      throw new Error(
        `Claude API error (HTTP ${res.status}): ${errorDetails}`,
      );
    }

    const data = await res.json();

    const text =
      data.content?.[0]?.text ||
      'I could not generate a response for this request.';

    return {
      content: text,
      conversation_id: conversationId,
      tokens_used:
        (data.usage?.input_tokens || 0) +
        (data.usage?.output_tokens || 0),
      provider: 'claude',
    };
  }
}
