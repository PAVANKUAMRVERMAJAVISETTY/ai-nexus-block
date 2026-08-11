import { describe, expect, it } from 'vitest';
import {
  DEMO_USER_ROLE,
  InvalidDemoUserError,
  MIN_PASSWORD_LENGTH,
  describeAuthError,
  suggestPassword,
  toPublicDemoUser,
  validateDemoUserInput,
} from '@/lib/admin/demo-user';

const valid = {
  displayName: 'Demo User',
  email: 'Interviewer@Example.com',
  password: 'correct-horse-battery',
};

describe('validateDemoUserInput', () => {
  it('accepts a well-formed request', () => {
    const result = validateDemoUserInput(valid);
    expect(result.displayName).toBe('Demo User');
    expect(result.password).toBe('correct-horse-battery');
  });

  it('normalizes the email to lowercase and trims fields', () => {
    const result = validateDemoUserInput({ ...valid, displayName: '  Demo User  ' });
    expect(result.email).toBe('interviewer@example.com');
    expect(result.displayName).toBe('Demo User');
  });

  it('requires every mandatory field', () => {
    expect(() => validateDemoUserInput({ ...valid, displayName: '' })).toThrow(InvalidDemoUserError);
    expect(() => validateDemoUserInput({ ...valid, email: '' })).toThrow(InvalidDemoUserError);
    expect(() => validateDemoUserInput({ ...valid, password: '' })).toThrow(InvalidDemoUserError);
    expect(() => validateDemoUserInput(null)).toThrow(InvalidDemoUserError);
    expect(() => validateDemoUserInput('nope')).toThrow(InvalidDemoUserError);
  });

  it('rejects malformed email addresses', () => {
    for (const email of ['notanemail', 'missing@tld', 'two@@at.com', 'spaces in@mail.com']) {
      expect(() => validateDemoUserInput({ ...valid, email }), email).toThrow(InvalidDemoUserError);
    }
  });

  it('enforces a minimum password length', () => {
    expect(() => validateDemoUserInput({ ...valid, password: 'short' })).toThrow(
      InvalidDemoUserError
    );
    expect(() =>
      validateDemoUserInput({ ...valid, password: 'x'.repeat(MIN_PASSWORD_LENGTH) })
    ).not.toThrow();
  });

  it('rejects passwords padded with whitespace', () => {
    expect(() => validateDemoUserInput({ ...valid, password: ' padded-password ' })).toThrow(
      InvalidDemoUserError
    );
  });

  // The password must never appear in anything the server might surface or log.
  it('never includes the password in an error message', () => {
    const secret = 'SuperSecretValue123';

    for (const input of [
      { ...valid, password: 'shrt' },
      { ...valid, password: ` ${secret} ` },
      { ...valid, password: 'x'.repeat(500) },
    ]) {
      try {
        validateDemoUserInput(input);
        throw new Error('expected a validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidDemoUserError);
        expect((error as Error).message).not.toContain(secret);
        expect((error as Error).message).not.toContain(input.password.trim());
      }
    }
  });

  it('accepts an optional phone number and normalizes it', () => {
    expect(validateDemoUserInput({ ...valid, phone: '+1 (555) 123-4567' }).phone).toBe(
      '+15551234567'
    );
    expect(validateDemoUserInput({ ...valid, phone: '' }).phone).toBeNull();
    expect(validateDemoUserInput(valid).phone).toBeNull();
  });

  it('rejects a malformed phone number', () => {
    expect(() => validateDemoUserInput({ ...valid, phone: 'call-me' })).toThrow(
      InvalidDemoUserError
    );
  });

  /* ---------------------------------------------------------------- */
  /* Privilege escalation                                              */
  /* ---------------------------------------------------------------- */

  // The validated object has no `role` at all, so a requested role cannot be
  // copied through by accident anywhere downstream.
  it('ignores any role supplied by the client', () => {
    for (const role of ['super_admin', 'admin', 'ADMIN', 'user']) {
      const result = validateDemoUserInput({ ...valid, role }) as unknown as Record<string, unknown>;
      expect(result.role, role).toBeUndefined();
    }
  });

  it('ignores other injected privilege fields', () => {
    const result = validateDemoUserInput({
      ...valid,
      role: 'super_admin',
      is_admin: true,
      app_metadata: { role: 'super_admin' },
      user_metadata: { role: 'super_admin' },
    }) as unknown as Record<string, unknown>;

    expect(Object.keys(result).sort()).toEqual(['displayName', 'email', 'password', 'phone']);
  });
});

describe('toPublicDemoUser', () => {
  it('returns only non-credential fields', () => {
    const result = toPublicDemoUser({
      id: 'user-1',
      displayName: 'Demo User',
      email: 'demo@example.com',
    });

    expect(Object.keys(result).sort()).toEqual(['displayName', 'email', 'id', 'role']);
  });

  // The response shape is built field-by-field precisely so this holds.
  it('cannot leak a password even if one is passed in', () => {
    const result = toPublicDemoUser({
      id: 'user-1',
      displayName: 'Demo User',
      email: 'demo@example.com',
      // @ts-expect-error — deliberately passing a field the type forbids
      password: 'SuperSecretValue123',
    }) as unknown as Record<string, unknown>;

    expect(result.password).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('SuperSecretValue123');
  });

  it('always reports the role as user', () => {
    const result = toPublicDemoUser({
      id: 'x',
      displayName: 'y',
      // @ts-expect-error — a caller trying to force another role
      role: 'super_admin',
      email: 'z@example.com',
    });

    expect(result.role).toBe('user');
    expect(DEMO_USER_ROLE).toBe('user');
  });
});

describe('suggestPassword', () => {
  it('produces a long password each time', () => {
    const first = suggestPassword();
    const second = suggestPassword();

    expect(first.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
    expect(first).not.toBe(second);
  });

  it('passes its own validator', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(() => validateDemoUserInput({ ...valid, password: suggestPassword() })).not.toThrow();
    }
  });

  // These get read aloud or retyped by an interviewer.
  it('omits glyphs that are easy to misread', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(suggestPassword()).not.toMatch(/[O0lI1]/);
    }
  });
});

describe('describeAuthError', () => {
  it('maps a duplicate email to 409 with a usable message', () => {
    const result = describeAuthError('A user with this email address has already been registered');
    expect(result.status).toBe(409);
    expect(result.message).toMatch(/already exists/i);
  });

  it('maps a misconfigured key to an actionable 500', () => {
    const result = describeAuthError('User not allowed');
    expect(result.status).toBe(500);
    expect(result.message).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('falls back to a generic message for anything unrecognized', () => {
    const result = describeAuthError('some novel database failure');
    expect(result.status).toBe(500);
    expect(result.message).toBe('The account could not be created.');
  });
});
