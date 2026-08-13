export interface WebSearchQuery {
  query: string;
  maxResults?: number;
  topic?: 'general' | 'news';
}

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
}
