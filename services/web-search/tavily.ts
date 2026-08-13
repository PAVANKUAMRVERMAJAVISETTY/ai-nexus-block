import type {
  WebSearchQuery,
  WebSearchResponse,
  WebSearchResult,
} from './types';

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const TAVILY_TIMEOUT_MS = 8000;

export async function tavilySearch(
  request: WebSearchQuery
): Promise<WebSearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);

  try {
    const response = await fetch(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: apiKey,
        query: request.query,
        topic: request.topic ?? 'general',
        max_results: request.maxResults ?? 5,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(
        `Tavily Search API returned ${response.status}: ${details}`
      );
    }

    const data = await response.json();

    const results: WebSearchResult[] = Array.isArray(data.results)
      ? data.results.map((item: any) => ({
          title: item.title ?? '',
          url: item.url ?? '',
          content: item.content ?? '',
          score: typeof item.score === 'number' ? item.score : 0,
          publishedDate: item.published_date ?? undefined,
        }))
      : [];

    return {
      query: request.query,
      results,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Tavily Search timed out after ${TAVILY_TIMEOUT_MS}ms`
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}
