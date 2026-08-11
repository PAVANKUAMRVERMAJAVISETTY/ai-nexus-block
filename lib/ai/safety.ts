export function sanitizeInput(input: string): string {
  return input.trim().slice(0, 8000);
}

export function validateMessage(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty.' };
  }
  if (message.length > 8000) {
    return { valid: false, error: 'Message exceeds maximum length of 8000 characters.' };
  }
  return { valid: true };
}

/*
 * Rate limiting used to live here as `rateLimited()`, which returned `false`
 * unconditionally — a function that answered "no, this user is not rate
 * limited" no matter how many requests they made. It was never wired up, but
 * leaving it in a module called `safety` invited a future caller to import it
 * and believe the request had been checked.
 *
 * The real implementation is `hit()` in `@/lib/security/rate-limit`, which is
 * what `/api/ai` and the IDE routes actually use.
 */
