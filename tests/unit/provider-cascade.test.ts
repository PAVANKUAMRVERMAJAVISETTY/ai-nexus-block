import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assistantFallbackOrder,
  defaultAIProvider,
  getProviderDiagnostics,
  isProviderConfigured,
} from '@/config/ai';
import { generate, selectProvider } from '@/lib/ai/nexus-assistant';
import { providers } from '@/lib/ai/provider';
import type { AIProviderId } from '@/types/common';

const ALL_KEYS = [
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
  'OLLAMA_HOST',
] as const;

const originalEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ALL_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ALL_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
  vi.restoreAllMocks();
});

describe('AI Provider Cascade Verification', () => {
  it('has the exact 11-provider fallback order required by specification', () => {
    const expectedOrder: AIProviderId[] = [
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

    expect(assistantFallbackOrder).toEqual(expectedOrder);
    expect(defaultAIProvider).toBe('groq');
  });

  it('completely excludes Claude from the active cascade', () => {
    expect(assistantFallbackOrder).not.toContain('claude');
    expect(assistantFallbackOrder).not.toContain('anthropic');

    process.env.ANTHROPIC_API_KEY = 'test_key_claude';
    process.env.CLAUDE_API_KEY = 'test_key_claude';

    expect(isProviderConfigured('claude')).toBe(false);
  });

  it('completely excludes Ollama from the active cascade in dev and prod', () => {
    expect(assistantFallbackOrder).not.toContain('ollama');

    vi.stubEnv('NODE_ENV', 'development');
    process.env.OLLAMA_HOST = 'http://localhost:11434';

    expect(isProviderConfigured('ollama')).toBe(false);
  });

  it('skips unavailable providers and selects the first configured provider', () => {
    process.env.GEMINI_API_KEY = 'gemini-key';

    // groq and cerebras are missing, so gemini (3rd in order) should be selected
    expect(selectProvider()).toBe('gemini');
  });

  it('proceeds through fallback sequentially until a provider succeeds', async () => {
    process.env.GROQ_API_KEY = 'groq-key';
    process.env.CEREBRAS_API_KEY = 'cerebras-key';
    process.env.GEMINI_API_KEY = 'gemini-key';

    const callOrder: string[] = [];

    vi.spyOn(providers.groq, 'generate').mockImplementation(async () => {
      callOrder.push('groq');
      throw new Error('Groq rate limited');
    });

    vi.spyOn(providers.cerebras, 'generate').mockImplementation(async () => {
      callOrder.push('cerebras');
      throw new Error('Cerebras timeout');
    });

    vi.spyOn(providers.gemini, 'generate').mockImplementation(async () => {
      callOrder.push('gemini');
      return {
        content: 'Response from Gemini',
        conversation_id: 'conv-123',
        tokens_used: 50,
        provider: 'gemini',
      };
    });

    const result = await generate({ message: 'Hello' });

    expect(callOrder).toEqual(['groq', 'cerebras', 'gemini']);
    expect(result.debugProvider).toBe('gemini');
    expect(result.content).toBe('Response from Nexus AI Assistant');
  });

  it('stops execution on the first successful provider and does NOT call providers simultaneously', async () => {
    process.env.GROQ_API_KEY = 'groq-key';
    process.env.CEREBRAS_API_KEY = 'cerebras-key';
    process.env.GEMINI_API_KEY = 'gemini-key';

    const groqSpy = vi.spyOn(providers.groq, 'generate').mockResolvedValue({
      content: 'Response from Groq',
      conversation_id: 'conv-groq',
      tokens_used: 20,
      provider: 'groq',
    });

    const cerebrasSpy = vi.spyOn(providers.cerebras, 'generate');
    const geminiSpy = vi.spyOn(providers.gemini, 'generate');

    const result = await generate({ message: 'Test message' });

    expect(result.debugProvider).toBe('groq');
    expect(groqSpy).toHaveBeenCalledTimes(1);
    expect(cerebrasSpy).not.toHaveBeenCalled();
    expect(geminiSpy).not.toHaveBeenCalled();
  });

  it('provides safe diagnostics showing PRESENT/MISSING without leaking key values', () => {
    process.env.GROQ_API_KEY = 'secret_groq_value_123';
    process.env.DEEPSEEK_API_KEY = 'secret_deepseek_value_456';

    const diagnostics = getProviderDiagnostics();

    expect(diagnostics).toHaveLength(11);
    expect(diagnostics[0]).toEqual({
      provider: 'groq',
      label: 'Groq',
      order: 1,
      status: 'PRESENT',
    });
    expect(diagnostics[1]).toEqual({
      provider: 'cerebras',
      label: 'Cerebras',
      order: 2,
      status: 'MISSING',
    });
    expect(diagnostics[4]).toEqual({
      provider: 'deepseek',
      label: 'DeepSeek',
      order: 5,
      status: 'PRESENT',
    });

    const outputJson = JSON.stringify(diagnostics);
    expect(outputJson).not.toContain('secret_groq_value_123');
    expect(outputJson).not.toContain('secret_deepseek_value_456');
  });
});
