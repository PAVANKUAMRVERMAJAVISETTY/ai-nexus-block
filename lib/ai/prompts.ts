import type { AIMode } from '@/types/common';

/**
 * System prompts keyed by `AIMode`.
 *
 * NOTE: these keys are deliberately snake_case so they match the `AIMode`
 * union exactly. They were previously camelCase (`recommendStack`), which meant
 * every `systemPrompts[mode]` lookup returned `undefined` and silently fell
 * back to the general prompt — so no assistant mode had any effect.
 */
export const systemPrompts: Record<AIMode, string> = {
  recommend_stack: `You are an expert AI product engineer. Recommend a technology stack for the user's project. Consider their requirements, constraints, and goals.`,
  debug_problem: `You are an expert debugger. Help the user identify and fix the problem in their code. Explain the root cause and provide a corrected solution.`,
  compare_tools: `You are an expert in AI and developer tools. Compare the tools the user mentions. Provide objective analysis of strengths, weaknesses, pricing, and use cases.`,
  plan_project: `You are a senior engineering architect. Help the user plan their project. Break it down into phases, milestones, and tasks.`,
  learn_concept: `You are an expert technical educator. Explain the concept the user asks about. Use clear language, examples, and analogies.`,
  general: `You are the Nexus AI Assistant, an agentic knowledge assistant for developers. Help the user with their engineering questions.`,
};

export type SystemPromptKey = AIMode;

/** Resolve a prompt for any mode value, falling back to `general`. */
export function getSystemPrompt(mode: string | undefined | null): string {
  if (mode && mode in systemPrompts) {
    return systemPrompts[mode as AIMode];
  }
  return systemPrompts.general;
}

/**
 * Deprecated camelCase aliases.
 * Retained so any existing import keeps compiling; prefer `getSystemPrompt`.
 */
export const legacySystemPromptAliases = {
  recommendStack: systemPrompts.recommend_stack,
  debugProblem: systemPrompts.debug_problem,
  compareTools: systemPrompts.compare_tools,
  planProject: systemPrompts.plan_project,
  learnConcept: systemPrompts.learn_concept,
  general: systemPrompts.general,
} as const;
