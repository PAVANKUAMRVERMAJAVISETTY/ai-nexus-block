export type AIProviderId = 'gemini' | 'openai' | 'claude';

export interface AIProviderConfig {
  id: AIProviderId;
  label: string;
  envKey: string;
  defaultModel: string;
}

export const aiProviders: AIProviderConfig[] = [
  { id: 'gemini', label: 'Google Gemini', envKey: 'GEMINI_API_KEY', defaultModel: 'gemini-3.6-flash' },
  { id: 'openai', label: 'OpenAI', envKey: 'OPENAI_API_KEY', defaultModel: 'gpt-4o' },
  { id: 'claude', label: 'Anthropic Claude', envKey: 'ANTHROPIC_API_KEY', defaultModel: 'claude-3-5-sonnet' },
];

export const defaultAIProvider: AIProviderId = 'gemini';

export const aiConfig = {
  maxTokens: 4096,
  temperature: 0.7,
  topP: 1,
  safetyThreshold: 0.8,
} as const;
