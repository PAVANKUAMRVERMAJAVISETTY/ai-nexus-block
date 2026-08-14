import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSystemPrompt, systemPrompts } from '@/lib/ai/prompts';
import { assistantIdentity } from '@/config/ide';

const PROVIDER_KEYS = [
  'AI_PROVIDER',
  'GROQ_API_KEY',
  'CEREBRAS_API_KEY',
  'GEMINI_API_KEY',
  'MISTRAL_API_KEY',
  'DEEPSEEK_API_KEY',
  'NVIDIA_NIM_API_KEY',
  'NVIDIA_API_KEY',
  'OPENROUTER_API_KEY',
  'GITHUB_TOKEN',
  'GITHUB_MODELS_TOKEN',
  'CLOUDFLARE_AI_API_KEY',
  'CLOUDFLARE_API_KEY',
  'COHERE_API_KEY',
  'HF_TOKEN',
  'HUGGINGFACE_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'CLAUDE_API_KEY',
  'OLLAMA_API_KEY',
  'OLLAMA_BASE_URL',
] as const;

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of PROVIDER_KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }

  vi.resetModules();
});

afterEach(() => {
  for (const key of PROVIDER_KEYS) {
    if (original[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original[key];
    }
  }
});

async function loadAssistant() {
  vi.resetModules();
  return await import('@/lib/ai/nexus-assistant');
}

describe('selectProvider', () => {
  it('throws a product-branded error when no backend is configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    try {
      const {
        NoProviderConfiguredError,
        isAssistantAvailable,
        selectProvider,
      } = await loadAssistant();

      expect(isAssistantAvailable()).toBe(false);
      expect(() => selectProvider()).toThrow(NoProviderConfiguredError);

      try {
        selectProvider();
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain(assistantIdentity.name);
        expect(message.toLowerCase()).not.toContain('gemini');
        expect(message.toLowerCase()).not.toContain('groq');
        expect(message.toLowerCase()).not.toContain('claude');
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('honours a preference when that backend is configured', async () => {
    process.env.MISTRAL_API_KEY = 'test';
    process.env.GROQ_API_KEY = 'test';

    const { selectProvider } = await loadAssistant();

    expect(selectProvider('mistral')).toBe('mistral');
  });

  it('ignores a preference whose key is missing, rather than failing', async () => {
    process.env.GEMINI_API_KEY = 'test';

    const { selectProvider } = await loadAssistant();

    expect(selectProvider('cohere')).toBe('gemini');
  });

  it('falls back through the configured order', async () => {
    process.env.MISTRAL_API_KEY = 'test';

    const {
      selectProvider,
      isAssistantAvailable,
    } = await loadAssistant();

    expect(selectProvider()).toBe('mistral');
    expect(isAssistantAvailable()).toBe(true);
  });
});

describe('sanitizeAssistantOutput', () => {
  it('replaces vendor self-identification with the product name', async () => {
    const { sanitizeAssistantOutput } = await loadAssistant();

    for (const leak of [
      'I am Gemini, a large language model.',
      'I am Claude, made by Anthropic.',
      'I am ChatGPT, developed by OpenAI.',
      'As GPT-4o, I can help.',
      'Google Gemini here.',
    ]) {
      const output = sanitizeAssistantOutput(leak);
      expect(output.toLowerCase(), leak).not.toContain('gemini');
      expect(output.toLowerCase(), leak).not.toContain('claude');
      expect(output.toLowerCase(), leak).not.toContain('chatgpt');
      expect(output.toLowerCase(), leak).not.toContain('gpt-4');
      expect(output).toContain(assistantIdentity.name);
    }
  });

  it('collapses repeated substitutions', async () => {
    const { sanitizeAssistantOutput } = await loadAssistant();

    const output = sanitizeAssistantOutput(
      'Anthropic Claude and Google Gemini'
    );

    expect(output).not.toMatch(
      new RegExp(
        `${assistantIdentity.name}\\s+${assistantIdentity.name}`
      )
    );
  });

  it('leaves ordinary technical prose untouched', async () => {
    const { sanitizeAssistantOutput } = await loadAssistant();

    const text =
      'Use `useEffect` to synchronize with an external system in React 18.';

    expect(sanitizeAssistantOutput(text)).toBe(text);
  });
});

describe('getSystemPrompt', () => {
  it('resolves each AIMode to its own prompt', () => {
    expect(getSystemPrompt('recommend_stack')).toBe(
      systemPrompts.recommend_stack
    );

    expect(getSystemPrompt('debug_problem')).toBe(
      systemPrompts.debug_problem
    );

    expect(getSystemPrompt('compare_tools')).toBe(
      systemPrompts.compare_tools
    );

    expect(getSystemPrompt('plan_project')).toBe(
      systemPrompts.plan_project
    );

    expect(getSystemPrompt('learn_concept')).toBe(
      systemPrompts.learn_concept
    );

    expect(getSystemPrompt('debug_problem')).not.toBe(
      systemPrompts.general
    );
  });

  it('falls back to general for unknown or missing modes', () => {
    expect(getSystemPrompt('nonsense')).toBe(systemPrompts.general);
    expect(getSystemPrompt(undefined)).toBe(systemPrompts.general);
    expect(getSystemPrompt(null)).toBe(systemPrompts.general);
  });
});
