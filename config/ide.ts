import {
  BookOpen,
  Bug,
  ClipboardCheck,
  Compass,
  FileText,
  GraduationCap,
  Hammer,
  Lightbulb,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  IdeAssistantMode,
  IdeExplanationLevel,
  IdeRunKind,
} from '@/types/ide';

/* ------------------------------------------------------------------ */
/* Product identity                                                    */
/* ------------------------------------------------------------------ */

/**
 * The assistant has exactly one user-facing name. Backend providers
 * (Gemini / OpenAI / Anthropic) are an implementation detail and must never
 * appear in workspace or IDE UI. Provider attribution is available only on
 * admin and debug surfaces.
 */
export const assistantIdentity = {
  name: 'Nexus AI Assistant',
  shortName: 'Nexus AI',
  tagline: 'Your project-aware pair programmer',
} as const;

/* ------------------------------------------------------------------ */
/* Assistant modes                                                     */
/* ------------------------------------------------------------------ */

export interface IdeAssistantModeConfig {
  id: IdeAssistantMode;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Whether this mode is allowed to return file change proposals. */
  canPropose: boolean;
  placeholder: string;
}

export const ideAssistantModes: IdeAssistantModeConfig[] = [
  {
    id: 'explain',
    label: 'Explain',
    icon: BookOpen,
    description: 'Describe what code does, why it exists, and what it depends on.',
    canPropose: false,
    placeholder: 'Explain this file',
  },
  {
    id: 'debug',
    label: 'Debug',
    icon: Bug,
    description: 'Diagnose an error or failing command and find the root cause.',
    canPropose: false,
    placeholder: 'Why is this error happening?',
  },
  {
    id: 'fix',
    label: 'Fix',
    icon: Wand2,
    description: 'Propose the smallest safe change that resolves the problem.',
    canPropose: true,
    placeholder: 'Fix the type error in this file',
  },
  {
    id: 'refactor',
    label: 'Refactor',
    icon: Hammer,
    description: 'Restructure code without changing behaviour.',
    canPropose: true,
    placeholder: 'Extract this into a reusable hook',
  },
  {
    id: 'create',
    label: 'Create',
    icon: Sparkles,
    description: 'Generate new files, routes, or components.',
    canPropose: true,
    placeholder: 'Create an API route for saving notes',
  },
  {
    id: 'review',
    label: 'Review',
    icon: ClipboardCheck,
    description: 'Critique code for correctness, security, and clarity.',
    canPropose: false,
    placeholder: 'Review this code',
  },
  {
    id: 'test',
    label: 'Test',
    icon: Lightbulb,
    description: 'Write or repair tests for the selected code.',
    canPropose: true,
    placeholder: 'Write tests for this module',
  },
  {
    id: 'architect',
    label: 'Architect',
    icon: Compass,
    description: 'Explain or plan the structure of the project as a whole.',
    canPropose: false,
    placeholder: 'Explain this project architecture',
  },
  {
    id: 'document',
    label: 'Document',
    icon: FileText,
    description: 'Generate READMEs, comments, and technical documentation.',
    canPropose: true,
    placeholder: 'Create a README for this project',
  },
  {
    id: 'learn',
    label: 'Learn',
    icon: GraduationCap,
    description: 'Teach the concept behind the code, tuned to your level.',
    canPropose: false,
    placeholder: 'Explain this like I am a beginner',
  },
];

export const defaultAssistantMode: IdeAssistantMode = 'explain';

export const explanationLevels: {
  id: IdeExplanationLevel;
  label: string;
  description: string;
}[] = [
  { id: 'beginner', label: 'Beginner', description: 'Teach from first principles, define jargon, use analogies.' },
  { id: 'intermediate', label: 'Intermediate', description: 'Assume working knowledge, focus on the specifics.' },
  { id: 'advanced', label: 'Advanced', description: 'Terse and technical, no basics restated.' },
];

export const defaultExplanationLevel: IdeExplanationLevel = 'intermediate';

/** Modes that may return a change proposal, as a fast lookup. */
export const proposingModes = new Set<IdeAssistantMode>(
  ideAssistantModes.filter((m) => m.canPropose).map((m) => m.id)
);

/* ------------------------------------------------------------------ */
/* Runs                                                                */
/* ------------------------------------------------------------------ */

/**
 * Mapping from a well-known package.json script name to a run kind.
 * Anything not listed here is still runnable, just classified as `custom`.
 */
export const scriptKindMap: Record<string, IdeRunKind> = {
  dev: 'dev',
  start: 'dev',
  build: 'build',
  test: 'test',
  'test:unit': 'test',
  'test:e2e': 'test',
  typecheck: 'typecheck',
  'type-check': 'typecheck',
  tsc: 'typecheck',
  lint: 'lint',
};

/**
 * Commands the local agent is permitted to execute, matched against the first
 * token. The agent enforces this list again on the client side — this copy
 * exists so the server can reject obviously invalid work before queueing it.
 */
export const allowedCommandBinaries = [
  'npm',
  'pnpm',
  'yarn',
  'bun',
  'npx',
  'node',
  'git',
  'tsc',
  'eslint',
  'next',
  'vitest',
  'jest',
  'playwright',
  'python',
  'python3',
  'pip',
  'pytest',
  'java',
  'javac',
  'mvn',
  'gradle',
  'go',
  'cargo',
  'make',
] as const;

/** Commands that require an extra confirmation step in the UI. */
export const elevatedCommandPatterns = [
  /^git\s+push/,
  /^git\s+reset\s+--hard/,
  /^npm\s+publish/,
  /\brm\b/,
];

export const runDefaults = {
  /** Agent-side wall-clock ceiling for a single command. */
  timeoutMs: 10 * 60 * 1000,
  /** How often the browser polls a run for new output. */
  pollIntervalMs: 1200,
  /** Cap on persisted stdout/stderr per run, to keep rows bounded. */
  maxOutputBytes: 256 * 1024,
} as const;

/* ------------------------------------------------------------------ */
/* Indexing                                                            */
/* ------------------------------------------------------------------ */

export const indexDefaults = {
  /** Files larger than this are indexed by metadata only, never by content. */
  maxIndexableFileBytes: 128 * 1024,
  /** Ceiling on files summarized into the AI context per request. */
  maxContextFiles: 40,
  /** Ceiling on characters of file content sent to a provider per request. */
  maxContextChars: 24_000,
} as const;

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export const editorDefaults = {
  fontSize: 13,
  tabSize: 2,
  minimapMinWidthPx: 900,
  /** Files above this size open read-only to protect the browser. */
  maxEditableBytes: 1024 * 1024,
} as const;
