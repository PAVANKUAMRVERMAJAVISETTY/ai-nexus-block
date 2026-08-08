import type { AIMode } from '@/types/common';

export interface AIContextEntry {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function buildContext(mode: AIMode, userMessage: string): AIContextEntry[] {
  // TODO: Implement RAG context building in a later stage.
  // This will include vector search results, user history, and relevant knowledge.
  return [
    { role: 'user', content: userMessage },
  ];
}
