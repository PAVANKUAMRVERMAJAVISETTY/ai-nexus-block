import type { AIRecommendation, AIRecommendationItem } from '@/types/ai';
import type { AIMode } from '@/types/common';

// TODO: Implement AI recommendation engine in a later stage.

export async function generateRecommendations(
  _query: string,
  _mode: AIMode
): Promise<{ recommendation: AIRecommendation; items: AIRecommendationItem[] }> {
  throw new Error('Recommendation engine is not yet implemented.');
}
