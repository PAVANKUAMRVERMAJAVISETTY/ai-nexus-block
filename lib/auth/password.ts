/**
 * Shared password rules.
 *
 * One definition used by sign-up, the in-app change flow, the recovery flow and
 * admin-created demo accounts, so a password accepted in one place is never
 * rejected in another.
 */

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export interface PasswordCheck {
  valid: boolean;
  /** Reason it was rejected. Never contains the password itself. */
  error: string | null;
  /** 0–4, for the strength meter. */
  score: number;
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
}

/**
 * Validate a password and score it.
 *
 * Deliberately permissive about composition: length dominates real-world
 * strength, and character-class rules mostly push people toward `Passw0rd!`.
 * The score drives a meter, not a gate — only the length rules reject.
 */
export function checkPassword(password: unknown): PasswordCheck {
  if (typeof password !== 'string' || !password) {
    return { valid: false, error: 'Enter a password.', score: 0, label: 'Too short' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      score: 0,
      label: 'Too short',
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`,
      score: 0,
      label: 'Too short',
    };
  }

  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;

  // A long string of one repeated character is long, not strong.
  if (/^(.)\1+$/.test(password)) score = 0;

  const labels: PasswordCheck['label'][] = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return { valid: true, error: null, score, label: labels[score] };
}

/** Confirmation must match exactly — trimming here would hide a typo. */
export function passwordsMatch(password: string, confirmation: string): boolean {
  return password === confirmation;
}
