export type { AIProviderId } from '@/types/common';

import type { AIProviderId } from '@/types/common';

export interface AIProviderConfig {
  id: AIProviderId;
  label: string;
  envKey?: string;
  defaultModel?: string;
}

export const aiProviders: AIProviderConfig[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-3.6-flash',
  },
  {
    id: 'groq',
    label: 'Groq',
    envKey: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    envKey: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-small-latest',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-5-sonnet',
  },
  {
    id: 'ollama',
    label: 'Ollama',
    defaultModel: 'qwen3:8b',
  },
];

export const defaultAIProvider: AIProviderId = 'gemini';

export const assistantFallbackOrder: AIProviderId[] = [
  'gemini',
  'groq',
  'mistral',
  'openai',
  'claude',
  'ollama',
];

export const providerTimeouts: Record<AIProviderId, number> = {
  gemini: 6000,
  groq: 3500,
  mistral: 6000,
  openai: 10000,
  claude: 10000,
  ollama: 15000,
};

export function isProviderConfigured(
  providerId: AIProviderId
): boolean {
  if (providerId === 'ollama') {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const hasCustomOllamaHost = !!(
      process.env.OLLAMA_HOST ||
      process.env.OLLAMA_BASE_URL
    );

    return isDevelopment || hasCustomOllamaHost;
  }

  const provider = aiProviders.find((item) => item.id === providerId);

  if (!provider?.envKey) {
    return false;
  }

  return !!process.env[provider.envKey];
}

export function configuredProviderIds(): AIProviderId[] {
  return assistantFallbackOrder.filter(isProviderConfigured);
}

export function resolveModel(providerId: AIProviderId): string {
  const provider = aiProviders.find((item) => item.id === providerId);

  if (providerId === 'gemini') {
    return process.env.GEMINI_MODEL || provider?.defaultModel || 'gemini-3.6-flash';
  }

  if (providerId === 'groq') {
    return process.env.GROQ_MODEL || provider?.defaultModel || 'llama-3.3-70b-versatile';
  }

  if (providerId === 'mistral') {
    return process.env.MISTRAL_MODEL || provider?.defaultModel || 'mistral-small-latest';
  }

  if (providerId === 'openai') {
    return process.env.OPENAI_MODEL || provider?.defaultModel || 'gpt-4o';
  }

  if (providerId === 'claude') {
    return process.env.ANTHROPIC_MODEL || provider?.defaultModel || 'claude-3-5-sonnet';
  }

  return process.env.OLLAMA_MODEL || provider?.defaultModel || 'qwen3:8b';
}


