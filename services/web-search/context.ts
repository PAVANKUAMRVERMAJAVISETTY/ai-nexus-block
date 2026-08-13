import type { WebSearchResult } from './types';

export function formatWebSearchContext(
  results: WebSearchResult[]
): string {
  if (!results.length) {
    return 'No web search results were found.';
  }

  return results
    .slice(0, 5)
    .map(
      (result, index) =>
        `[SOURCE ${index + 1}]
Title: ${result.title}
URL: ${result.url}
Content: ${result.content}`
    )
    .join('\n\n');
}
