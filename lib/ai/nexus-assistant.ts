/**
 * Nexus AI Assistant — the product-facing assistant layer.
 *
 * PRODUCT RULE: the user talks to "Nexus AI Assistant". Gemini, OpenAI and
 * Anthropic are interchangeable backends behind it and must never appear in
 * workspace or IDE UI, error messages, or persisted message content. Provider
 * attribution is returned separately as `debugProvider` and is surfaced only on
 * admin/debug surfaces gated by the super_admin role.
 *
 * This layer sits on top of the existing `getProvider()` registry rather than
 * replacing it, so the assistant page and the IDE share one provider stack.
 */

import type { AIProviderId, AIMode } from '@/types/common';
import type { AIRequest, AIResponse, AIAttachment } from '@/types/ai';
import { attachmentReferenceText } from '@/services/ai/attachments';
import { getProvider } from './provider';
import {
  aiProviders,
  assistantFallbackOrder,
  configuredProviderIds,
  isProviderConfigured,
  resolveModel,
providerTimeouts } from '@/config/ai';
import { assistantIdentity } from '@/config/ide';

function withProviderTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  providerId: AIProviderId
): Promise<T> {
  const timeoutMs = providerTimeouts[providerId] || 15000;
  const controller = new AbortController();

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(
        new Error(
          `Provider ${providerId} timed out after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    operation(controller.signal).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
export class NoProviderConfiguredError extends Error {
  constructor() {
    // Deliberately provider-agnostic: the user should not have to know which
    // vendor is missing, only that the assistant is unavailable.
    super(
      `${assistantIdentity.name} is not available yet. No AI backend has been configured on this server.`
    );
    this.name = 'NoProviderConfiguredError';
  }
}

export interface NexusGenerateOptions {
  message: string;
  /** Fully-composed system instruction. */
  system?: string;
  mode?: AIMode;
  conversationId?: string;
  maxTokens?: number;
  temperature?: number;
  /**
   * Admin-selected preference. Ignored when that provider has no API key, so a
   * stale admin setting can never take the assistant offline.
   */
  preferredProvider?: AIProviderId;
  attachments?: AIAttachment[];
}

export interface NexusGenerateResult {
  content: string;
  conversationId: string | null;
  tokensUsed: number;
  /** Never render this outside an admin/debug surface. */
  debugProvider: AIProviderId;
  debugModel: string;
}

/**
 * Choose which backend answers this request.
 * Preference first, then the configured fallback order, then anything with a key.
 */
export function selectProvider(preferred?: AIProviderId): AIProviderId {
  if (preferred && isProviderConfigured(preferred)) return preferred;

  for (const candidate of assistantFallbackOrder) {
    if (isProviderConfigured(candidate)) return candidate;
  }

  const configured = configuredProviderIds();
  if (configured.length) return configured[0];

  throw new NoProviderConfiguredError();
}

/** True when at least one backend can answer. */
export function isAssistantAvailable(): boolean {
  return configuredProviderIds().length > 0;
}

/**
 * Strip provider identity from anything a backend might echo back, so a raw
 * provider error or self-identification never reaches the user as product text.
 */
export function sanitizeAssistantOutput(text: string): string {
  let output = text;

  for (const provider of aiProviders) {
    const vendorPattern = new RegExp(`\\b${provider.label}\\b`, 'gi');
    output = output.replace(vendorPattern, assistantIdentity.name);
  }

  return output
    .replace(/\b(Google\s+)?Gemini\b/gi, assistantIdentity.name)
    .replace(/\b(Anthropic\s+)?Claude\b/gi, assistantIdentity.name)
    .replace(/\bOpenAI\b/gi, assistantIdentity.name)
    .replace(/\bChatGPT\b/gi, assistantIdentity.name)
    .replace(/\bGPT-\d[\w.-]*/gi, assistantIdentity.name)
    // Collapse the repetition the substitutions above can create.
    .replace(new RegExp(`(${assistantIdentity.name})(\\s+\\1)+`, 'g'), '$1');
}

/**
 * Generate a response as the Nexus AI Assistant.
 * Falls through to the next configured backend when one errors, so a single
 * vendor outage degrades rather than breaks the assistant.
 */
export async function generate(options: NexusGenerateOptions): Promise<NexusGenerateResult> {
  const attempted = new Set<AIProviderId>();
  const errors: string[] = [];

  const order: AIProviderId[] = [];
  try {
    order.push(selectProvider(options.preferredProvider));
  } catch (error) {
    if (error instanceof NoProviderConfiguredError) throw error;
    throw error;
  }
  for (const candidate of assistantFallbackOrder) {
    if (!order.includes(candidate) && isProviderConfigured(candidate)) order.push(candidate);
  }

  for (const providerId of order) {
    if (attempted.has(providerId)) continue;
    attempted.add(providerId);

    try {
      const provider = getProvider(providerId);
      const attachmentText = attachmentReferenceText(options.attachments ?? []);
      const effectiveSystem = [options.system, attachmentText]
        .filter(Boolean)
        .join('\n\n');

      const request: AIRequest = {
        message: options.message,
        mode: (options.mode ?? 'general') as AIMode,
        conversation_id: options.conversationId,
        systemOverride: effectiveSystem,
        attachments: options.attachments,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      };

      const result: AIResponse = await withProviderTimeout((signal) => provider.generate({ ...request, signal }), providerId);

      return {
        content: sanitizeAssistantOutput(result.content),
        conversationId: options.conversationId ?? result.conversation_id ?? null,
        tokensUsed: result.tokens_used ?? 0,
        debugProvider: providerId,
        debugModel: resolveModel(providerId),
      };
    } catch (error) {
      // Record and try the next backend. The vendor name stays server-side.
      errors.push(`${providerId}: ${error instanceof Error ? error.message : 'unknown error'}`);
      console.error('[nexus-assistant] provider failed', providerId, error);
    }
  }

  throw new Error(
    `${assistantIdentity.name} could not complete this request. All configured AI backends failed.` +
      (process.env.NODE_ENV === 'development' ? ` (${errors.join('; ')})` : '')
  );
}






