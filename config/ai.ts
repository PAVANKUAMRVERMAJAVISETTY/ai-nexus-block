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
    id: 'groq',
    label: 'Groq',
    envKey: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    envKey: 'CEREBRAS_API_KEY',
    defaultModel: 'llama-3.3-70b',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-3.6-flash',
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    envKey: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-small-latest',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
  },
  {
    id: 'nvidia-nim',
    label: 'NVIDIA NIM',
    envKey: 'NVIDIA_NIM_API_KEY',
    defaultModel: 'meta/llama-3.3-70b-instruct',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
  },
  {
    id: 'github-models',
    label: 'GitHub Models',
    envKey: 'GITHUB_TOKEN',
    defaultModel: 'gpt-4o',
  },
  {
    id: 'cloudflare-ai',
    label: 'Cloudflare AI',
    envKey: 'CLOUDFLARE_AI_API_KEY',
    defaultModel: '@cf/meta/llama-3.3-70b-instruct',
  },
  {
    id: 'cohere',
    label: 'Cohere',
    envKey: 'COHERE_API_KEY',
    defaultModel: 'command-r-plus',
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    envKey: 'HF_TOKEN',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
  },
];

export const defaultAIProvider: AIProviderId = 'groq';

export const assistantFallbackOrder: AIProviderId[] = [
  'groq',
  'cerebras',
  'gemini',
  'mistral',
  'deepseek',
  'nvidia-nim',
  'openrouter',
  'github-models',
  'cloudflare-ai',
  'cohere',
  'huggingface',
];

export const providerTimeouts: Record<AIProviderId, number> = {
  groq: 3500,
  cerebras: 4000,
  gemini: 6000,
  mistral: 6000,
  deepseek: 8000,
  'nvidia-nim': 8000,
  openrouter: 8000,
  'github-models': 8000,
  'cloudflare-ai': 8000,
  cohere: 8000,
  huggingface: 10000,
  openai: 10000,
  claude: 10000,
  ollama: 15000,
};

export function isProviderConfigured(providerId: AIProviderId): boolean {
  if (providerId === 'claude' || providerId === 'ollama') {
    return false;
  }

  if (providerId === 'groq') return !!process.env.GROQ_API_KEY;
  if (providerId === 'cerebras') return !!process.env.CEREBRAS_API_KEY;
  if (providerId === 'gemini') return !!process.env.GEMINI_API_KEY;
  if (providerId === 'mistral') return !!process.env.MISTRAL_API_KEY;
  if (providerId === 'deepseek') return !!process.env.DEEPSEEK_API_KEY;
  if (providerId === 'nvidia-nim') return !!(process.env.NVIDIA_NIM_API_KEY || process.env.NVIDIA_API_KEY);
  if (providerId === 'openrouter') return !!process.env.OPENROUTER_API_KEY;
  if (providerId === 'github-models') return !!(process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_TOKEN);
  if (providerId === 'cloudflare-ai') return !!(process.env.CLOUDFLARE_AI_API_KEY || process.env.CLOUDFLARE_API_KEY);
  if (providerId === 'cohere') return !!process.env.COHERE_API_KEY;
  if (providerId === 'huggingface') return !!(process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY);
  if (providerId === 'openai') return !!process.env.OPENAI_API_KEY;

  return false;
}

export function configuredProviderIds(): AIProviderId[] {
  return assistantFallbackOrder.filter(isProviderConfigured);
}

export function resolveModel(providerId: AIProviderId): string {
  const provider = aiProviders.find((item) => item.id === providerId);

  if (providerId === 'groq') return process.env.GROQ_MODEL || provider?.defaultModel || 'llama-3.3-70b-versatile';
  if (providerId === 'cerebras') return process.env.CEREBRAS_MODEL || provider?.defaultModel || 'llama-3.3-70b';
  if (providerId === 'gemini') return process.env.GEMINI_MODEL || provider?.defaultModel || 'gemini-3.6-flash';
  if (providerId === 'mistral') return process.env.MISTRAL_MODEL || provider?.defaultModel || 'mistral-small-latest';
  if (providerId === 'deepseek') return process.env.DEEPSEEK_MODEL || provider?.defaultModel || 'deepseek-chat';
  if (providerId === 'nvidia-nim') return process.env.NVIDIA_NIM_MODEL || process.env.NVIDIA_MODEL || provider?.defaultModel || 'meta/llama-3.3-70b-instruct';
  if (providerId === 'openrouter') return process.env.OPENROUTER_MODEL || provider?.defaultModel || 'meta-llama/llama-3.3-70b-instruct';
  if (providerId === 'github-models') return process.env.GITHUB_MODELS_MODEL || provider?.defaultModel || 'gpt-4o';
  if (providerId === 'cloudflare-ai') return process.env.CLOUDFLARE_AI_MODEL || provider?.defaultModel || '@cf/meta/llama-3.3-70b-instruct';
  if (providerId === 'cohere') return process.env.COHERE_MODEL || provider?.defaultModel || 'command-r-plus';
  if (providerId === 'huggingface') return process.env.HF_MODEL || process.env.HUGGINGFACE_MODEL || provider?.defaultModel || 'meta-llama/Llama-3.3-70B-Instruct';
  if (providerId === 'openai') return process.env.OPENAI_MODEL || provider?.defaultModel || 'gpt-4o';

  return provider?.defaultModel || 'unknown';
}

export interface ProviderDiagnostic {
  provider: AIProviderId;
  label: string;
  order: number;
  status: 'PRESENT' | 'MISSING';
}

export function getProviderDiagnostics(): ProviderDiagnostic[] {
  return assistantFallbackOrder.map((id, index) => {
    const provider = aiProviders.find((p) => p.id === id);
    const configured = isProviderConfigured(id);
    return {
      provider: id,
      label: provider?.label || id,
      order: index + 1,
      status: configured ? 'PRESENT' : 'MISSING',
    };
  });
}
