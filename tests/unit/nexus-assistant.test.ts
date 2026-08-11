import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  NoProviderConfiguredError,
  isAssistantAvailable,
  sanitizeAssistantOutput,
  selectProvider,
} from '@/lib/ai/nexus-assistant';
import { getSystemPrompt, systemPrompts } from '@/lib/ai/prompts';
import { assistantIdentity } from '@/config/ide';

const KEYS = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'] as const;
const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe('selectProvider', () => {
  it('throws a product-branded error when nothing is configured', () => {
    expect(isAssistantAvailable()).toBe(false);
    expect(() => selectProvider()).toThrow(NoProviderConfiguredError);

    try {
      selectProvider();
    } catch (error) {
      // The user must never be told which vendor is missing.
      const message = (error as Error).message;
      expect(message).toContain(assistantIdentity.name);
      expect(message.toLowerCase()).not.toContain('gemini');
      expect(message.toLowerCase()).not.toContain('openai');
      expect(message.toLowerCase()).not.toContain('anthropic');
    }
  });

  it('honours a preference when that backend is configured', () => {
    process.env.OPENAI_API_KEY = 'test';
    process.env.GEMINI_API_KEY = 'test';
    expect(selectProvider('openai')).toBe('openai');
  });

  it('ignores a preference whose key is missing, rather than failing', () => {
    process.env.GEMINI_API_KEY = 'test';
    // A stale admin setting must not take the assistant offline.
    expect(selectProvider('claude')).toBe('gemini');
  });

  it('falls back through the configured order', () => {
    process.env.ANTHROPIC_API_KEY = 'test';
    expect(selectProvider()).toBe('claude');
    expect(isAssistantAvailable()).toBe(true);
  });
});

describe('sanitizeAssistantOutput', () => {
  it('replaces vendor self-identification with the product name', () => {
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

  it('collapses repeated substitutions', () => {
    const output = sanitizeAssistantOutput('Anthropic Claude and Google Gemini');
    expect(output).not.toMatch(new RegExp(`${assistantIdentity.name}\\s+${assistantIdentity.name}`));
  });

  it('leaves ordinary technical prose untouched', () => {
    const text = 'Use `useEffect` to synchronize with an external system in React 18.';
    expect(sanitizeAssistantOutput(text)).toBe(text);
  });
});

describe('getSystemPrompt', () => {
  // The keys were camelCase while AIMode is snake_case, so every lookup
  // silently returned undefined and every mode fell back to `general`.
  it('resolves each AIMode to its own prompt', () => {
    expect(getSystemPrompt('recommend_stack')).toBe(systemPrompts.recommend_stack);
    expect(getSystemPrompt('debug_problem')).toBe(systemPrompts.debug_problem);
    expect(getSystemPrompt('compare_tools')).toBe(systemPrompts.compare_tools);
    expect(getSystemPrompt('plan_project')).toBe(systemPrompts.plan_project);
    expect(getSystemPrompt('learn_concept')).toBe(systemPrompts.learn_concept);

    expect(getSystemPrompt('debug_problem')).not.toBe(systemPrompts.general);
  });

  it('falls back to general for unknown or missing modes', () => {
    expect(getSystemPrompt('nonsense')).toBe(systemPrompts.general);
    expect(getSystemPrompt(undefined)).toBe(systemPrompts.general);
    expect(getSystemPrompt(null)).toBe(systemPrompts.general);
  });
});
