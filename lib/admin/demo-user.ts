/**
 * Validation for admin-created demo accounts.
 *
 * Kept as a pure module so the security-critical part — that the role is
 * FORCED to 'user' and can never be influenced by the request body — is
 * testable without a database.
 *
 * A demo account is an ordinary user account. It is not a special kind of
 * principal, has no extra permissions, and is isolated from every other user
 * by the same Row Level Security that separates any two real users.
 */

/** The only role this endpoint may ever create. Not configurable by design. */
export const DEMO_USER_ROLE = 'user' as const;

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export class InvalidDemoUserError extends Error {
  field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'InvalidDemoUserError';
    this.field = field;
  }
}

export interface DemoUserInput {
  displayName: string;
  email: string;
  password: string;
  phone?: string | null;
}

/** What is safe to hand to Supabase. Note there is no `role` field at all. */
export interface ValidatedDemoUser {
  displayName: string;
  email: string;
  password: string;
  phone: string | null;
}

/** RFC-shaped enough to catch typos without rejecting valid addresses. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** E.164-ish; Supabase expects digits with an optional leading +. */
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

function requireField(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new InvalidDemoUserError(field, `${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new InvalidDemoUserError(field, `${field} must be ${max} characters or fewer.`);
  }
  return trimmed;
}

/**
 * Validate an untrusted request body.
 *
 * SECURITY: any `role` in the input is ignored entirely — not read, not
 * copied, not echoed. The caller applies `DEMO_USER_ROLE` unconditionally, so
 * a request asking for `super_admin` produces an ordinary user with no error,
 * because there is no code path that could act on it.
 *
 * Error messages deliberately never quote the password.
 */
export function validateDemoUserInput(raw: unknown): ValidatedDemoUser {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new InvalidDemoUserError('body', 'Request body must be a JSON object.');
  }

  const input = raw as Record<string, unknown>;

  const displayName = requireField(input.displayName, 'Display name', 80);
  const email = requireField(input.email, 'Email', 254).toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw new InvalidDemoUserError('email', 'Enter a valid email address.');
  }

  if (typeof input.password !== 'string' || !input.password) {
    throw new InvalidDemoUserError('password', 'Password is required.');
  }

  const password = input.password;

  // Length is stated without ever including the value in the message.
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new InvalidDemoUserError(
      'password',
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    );
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new InvalidDemoUserError(
      'password',
      `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`
    );
  }
  if (password.trim() !== password) {
    throw new InvalidDemoUserError(
      'password',
      'Password must not start or end with whitespace — it is easy to mistype when read aloud.'
    );
  }

  let phone: string | null = null;
  if (input.phone !== undefined && input.phone !== null && input.phone !== '') {
    if (typeof input.phone !== 'string') {
      throw new InvalidDemoUserError('phone', 'Phone must be a string.');
    }
    const candidate = input.phone.replace(/[\s()-]/g, '');
    if (!PHONE_PATTERN.test(candidate)) {
      throw new InvalidDemoUserError('phone', 'Enter a valid phone number, or leave it blank.');
    }
    phone = candidate;
  }

  return { displayName, email, password, phone };
}

/**
 * The public shape returned to the browser.
 * Constructed field-by-field so no credential can be included by accident.
 */
export interface PublicDemoUser {
  id: string;
  displayName: string;
  email: string;
  role: typeof DEMO_USER_ROLE;
}

export function toPublicDemoUser(input: {
  id: string;
  displayName: string;
  email: string;
}): PublicDemoUser {
  return {
    id: input.id,
    displayName: input.displayName,
    email: input.email,
    // Never read from the database row or the request — always the constant.
    role: DEMO_USER_ROLE,
  };
}

/** Suggest a strong password for the admin to use, so weak ones are not typed. */
export function suggestPassword(): string {
  // Ambiguous glyphs (O/0, l/1/I) are excluded: these get read aloud or typed
  // by an interviewer, and a misread character looks like a broken login.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(20);
  crypto.getRandomValues(bytes);

  let password = '';
  for (let i = 0; i < bytes.length; i += 1) {
    password += alphabet[bytes[i] % alphabet.length];
  }
  return password;
}

/** Map a Supabase Auth admin error onto a safe, useful message. */
export function describeAuthError(message: string): { status: number; message: string } {
  const text = message.toLowerCase();

  if (text.includes('already registered') || text.includes('already been registered')) {
    return {
      status: 409,
      message: 'An account with that email already exists. Use a different address.',
    };
  }
  if (text.includes('password')) {
    return { status: 400, message: 'That password was rejected. Choose a longer one.' };
  }
  if (text.includes('email')) {
    return { status: 400, message: 'That email address was rejected.' };
  }
  if (text.includes('not allowed') || text.includes('permission')) {
    return {
      status: 500,
      message:
        'The server is not permitted to create users. Check that SUPABASE_SERVICE_ROLE_KEY is a service-role key.',
    };
  }

  return { status: 500, message: 'The account could not be created.' };
}
