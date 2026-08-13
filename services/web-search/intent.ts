import type { AIMode } from '@/types/common';

const WEB_SEARCH_PATTERNS = [
  /\b(latest|current|currently|today|tonight|yesterday|recent|recently)\b/i,
  /\b(this week|this month|this year|right now|as of now)\b/i,
  /\b(news|update|updates|release|released|version|versions|changelog)\b/i,
  /\b(price|pricing|cost|costs|stock|stocks|weather)\b/i,
  /\b(available now|currently available|is .* still)\b/i,
];

export function needsWebSearch(
  message: string,
  mode: AIMode = 'general'
): boolean {
  if (WEB_SEARCH_PATTERNS.some((pattern) => pattern.test(message))) {
    return true;
  }

  if (mode === 'compare_tools' && /\b(vs|versus|compare|comparison|better)\b/i.test(message)) {
    return true;
  }

  return false;
}
