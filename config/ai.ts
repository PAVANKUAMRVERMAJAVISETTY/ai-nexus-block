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
    defaultModel: 'gemini-3.6-flash',
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
    defaultModel: 'claude-3-5-sonnet',
    modelEnvKey: 'ANTHROPIC_MODEL',
  },
  {
    id: 'ollama',
    label: 'Ollama (Local LLM)',
    envKey: '',
    defaultModel: 'llama3',
    modelEnvKey: 'OLLAMA_MODEL',
  }
];

export const defaultAIProvider: AIProviderId = 'gemini';

export const assistantFallbackOrder: AIProviderId[] = [
  'gemini',
  'openai',
  'claude',
  'ollama'
];

export const configuredProviderIds = (): AIProviderId[] => {
  return aiProviders
    .filter((provider) => {
      if (provider.id === 'ollama') return true;
      return !!process.env[provider.envKey];
    })
    .map((p) => p.id);
};

export const isProviderConfigured = (id: AIProviderId): boolean => {
  if (id === 'ollama') return true;
  const config = aiProviders.find((p) => p.id === id);
  return config ? !!process.env[config.envKey] : false;
};

export const resolveModel = (id: AIProviderId): string => {
  const config = aiProviders.find((p) => p.id === id);
  if (!config) return '';
  return process.env[config.modelEnvKey] || config.defaultModel;
};