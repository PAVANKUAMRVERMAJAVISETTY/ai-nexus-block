import type { UserResearchItem, CreateResearchInput } from '../types';

export async function fetchResearchItems(): Promise<UserResearchItem[]> {
  const res = await fetch('/api/research');
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch research collection');
  }
  return data.research || [];
}

export async function createResearchItem(input: CreateResearchInput): Promise<UserResearchItem> {
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      user_opinion: input.user_opinion ?? input.opinion ?? null,
      user_notes: input.user_notes ?? input.personal_notes ?? null,
      source_url: input.source_url ?? input.url ?? null,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save research entry');
  }
  return data.research;
}

export async function deleteResearchItem(id: string): Promise<void> {
  const res = await fetch(`/api/research?id=${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete research entry');
  }
}
