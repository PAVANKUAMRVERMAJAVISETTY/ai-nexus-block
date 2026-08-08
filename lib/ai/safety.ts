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

export function rateLimited(_userId: string): boolean {
  // TODO: Implement rate limiting in a later stage.
  return false;
}
