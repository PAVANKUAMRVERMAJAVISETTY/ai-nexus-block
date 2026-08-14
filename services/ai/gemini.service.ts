import type { AIProvider } from '@/lib/ai/provider';
import type { AIRequest, AIResponse } from '@/types/ai';
import { getSystemPrompt } from '@/lib/ai/prompts';
import { aiProviders } from '@/config/ai';
import { resolveAttachmentContent } from './attachments';

const defaultGeminiModel =
  aiProviders.find((provider) => provider.id === 'gemini')?.defaultModel ||
  'gemini-3.6-flash';

export class GeminiService implements AIProvider {
  id = 'gemini' as const;

  async generate(request: AIRequest): Promise<AIResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    const conversationId =
      request.conversation_id || crypto.randomUUID();

    if (!apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const systemInstruction =
      request.systemOverride || getSystemPrompt(request.mode);

    const model =
      process.env.GEMINI_MODEL || defaultGeminiModel;

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const resolvedAttachments = await resolveAttachmentContent(
      request.attachments ?? [],
    );

    const imageParts = resolvedAttachments
      .filter(
        (item) =>
          Boolean(item.base64) &&
          item.attachment.type === 'image' &&
          item.attachment.mime_type.startsWith('image/'),
      )
      .map((item) => ({
        inlineData: {
          mimeType: item.attachment.mime_type,
          data: item.base64,
        },
      }));

    const res = await fetch(endpoint, {
      method: 'POST',
      signal: request.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: systemInstruction,
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `User Question (${request.mode}): ${request.message}`,
              },
              ...imageParts,
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: request.maxTokens ?? 2048,
          ...(request.temperature !== undefined
            ? { temperature: request.temperature }
            : {}),
        },
      }),
    });

    if (!res.ok) {
      const errorDetails = await res.text();
      throw new Error(
        `Gemini API error (HTTP ${res.status}): ${errorDetails}`,
      );
    }

    const data = await res.json();

    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I could not generate a response for this request.';

    return {
      content: text,
      conversation_id: conversationId,
      tokens_used:
        data.usageMetadata?.totalTokenCount || 0,
      provider: 'gemini',
    };
  }
}
