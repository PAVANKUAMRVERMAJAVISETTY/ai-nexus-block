// Security utilities — to be implemented in a later stage.
// This module will contain input sanitization, rate limiting helpers, and auth guards.

export function sanitizeHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}
