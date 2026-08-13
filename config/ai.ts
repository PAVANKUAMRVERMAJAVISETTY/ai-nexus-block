export type AIProviderId = 'gemini' | 'openai' | 'claude' | 'ollama';

export interface AIProviderConfig {
  id: AIProviderId;
  /**
   * Internal label. Shown ONLY on admin and debug surfaces — never in the
   * workspace or IDE, where the assistant is always "Nexus AI Assistant".
   */
  label: string;
  envKey: string;
  defaultModel: string;
  /** Environment variable that overrides `defaultModel` at runtime. */
  modelEnvKey: string;
}

export const aiProviders: AIProviderConfig[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.0-flash',
    modelEnvKey: 'GEMINI_MODEL',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
    modelEnvKey: 'OPENAI_MODEL',
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-opus-5',
    modelEnvKey: 'ANTHROPIC_MODEL',
  },
  {
    id: 'ollama',
    label: 'Ollama',
    envKey: 'OLLAMA_BASE_URL',
    defaultModel: 'qwen3:8b',
    modelEnvKey: 'OLLAMA_MODEL',
  },
];

export const defaultAIProvider: AIProviderId = 'gemini';

/**
 * Order the Nexus AI Assistant tries backends in when no admin preference
 * applies, or when the preferred backend errors.
 */
export const assistantFallbackOrder: AIProviderId[] = [
  'gemini',
  'openai',
  'claude',
  'ollama',
];

export const aiConfig = {
  maxTokens: 4096,
  temperature: 0.7,
  topP: 1,
  safetyThreshold: 0.8,
} as const;

/** Providers whose required configuration is actually present on this server. */
export function configuredProviderIds(): AIProviderId[] {
  return aiProviders
    .filter((p) => Boolean(process.env[p.envKey]))
    .map((p) => p.id);
}

export function isProviderConfigured(id: AIProviderId): boolean {
  const provider = aiProviders.find((p) => p.id === id);
  return Boolean(provider && process.env[provider.envKey]);
}

/** Resolve the model for a provider, honouring its environment override. */
export function resolveModel(id: AIProviderId): string {
  const provider = aiProviders.find((p) => p.id === id);
  if (!provider) return '';
  return process.env[provider.modelEnvKey] || provider.defaultModel;
}
