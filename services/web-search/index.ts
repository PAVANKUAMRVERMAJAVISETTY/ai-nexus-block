import { tavilySearch } from './tavily';
import type { WebSearchQuery, WebSearchResponse } from './types';

export async function webSearch(
  request: WebSearchQuery
): Promise<WebSearchResponse> {
  return tavilySearch(request);
}
