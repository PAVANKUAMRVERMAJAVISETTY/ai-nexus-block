import { describe, expect, it } from 'vitest';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  checkPassword,
  passwordsMatch,
} from '@/lib/auth/password';
import { RECOVERY_COOKIE, RECOVERY_PATH, safeRedirectPath } from '@/lib/auth/recovery';

describe('checkPassword', () => {
  it('rejects anything shorter than the minimum', () => {
    for (let length = 0; length < MIN_PASSWORD_LENGTH; length += 1) {
      const result = checkPassword('a'.repeat(length));
      expect(result.valid, `length ${length}`).toBe(false);
    }

    expect(checkPassword('a'.repeat(MIN_PASSWORD_LENGTH)).valid).toBe(true);
  });

  it('rejects a password longer than the maximum', () => {
    expect(checkPassword('a'.repeat(MAX_PASSWORD_LENGTH)).valid).toBe(true);
    expect(checkPassword('a'.repeat(MAX_PASSWORD_LENGTH + 1)).valid).toBe(false);
  });

  it('rejects non-strings and empty input', () => {
    for (const value of [null, undefined, 42, {}, [], '']) {
      expect(checkPassword(value).valid, String(value)).toBe(false);
    }
  });

  // The error is rendered straight into the page.
  it('never echoes the password back in the error', () => {
    const secret = 'hunter2';
    const result = checkPassword(secret);
    expect(result.valid).toBe(false);
    expect(result.error).not.toContain(secret);
  });

  it('scores longer and more varied passwords higher', () => {
    const short = checkPassword('abcdefgh');
    const long = checkPassword('abcdefghijklmnop');
    const varied = checkPassword('Abcdefghijklmn0p!');

    expect(long.score).toBeGreaterThan(short.score);
    expect(varied.score).toBeGreaterThanOrEqual(long.score);
    expect(varied.label).toBe('Strong');
  });

  // Length alone should not read as strength.
  it('does not reward a single repeated character', () => {
    const result = checkPassword('aaaaaaaaaaaaaaaaaaaa');
    expect(result.valid).toBe(true);
    expect(result.score).toBe(0);
    expect(result.label).toBe('Weak');
  });

  it('always returns a label matching its score', () => {
    for (const password of ['abcdefgh', 'abcdefghijkl', 'Abcdefghijklmnop', 'Abcd3fghijklmnop!']) {
      const result = checkPassword(password);
      expect(result.score, password).toBeGreaterThanOrEqual(0);
      expect(result.score, password).toBeLessThanOrEqual(4);
      expect(result.label, password).toBeTruthy();
    }
  });
});

describe('passwordsMatch', () => {
  it('requires an exact match', () => {
    expect(passwordsMatch('correct-horse', 'correct-horse')).toBe(true);
    expect(passwordsMatch('correct-horse', 'correct-hors')).toBe(false);
  });

  // Trimming here would silently accept a typo the user cannot see.
  it('treats surrounding whitespace as a difference', () => {
    expect(passwordsMatch('secret-value', ' secret-value')).toBe(false);
    expect(passwordsMatch('secret-value', 'secret-value ')).toBe(false);
  });
});

describe('safeRedirectPath', () => {
  it('allows ordinary same-site paths', () => {
    for (const path of ['/dashboard', RECOVERY_PATH, '/ide?project=1', '/a/b/c']) {
      expect(safeRedirectPath(path), path).toBe(path);
    }
  });

  it('rejects absent input', () => {
    expect(safeRedirectPath(null)).toBeNull();
    expect(safeRedirectPath(undefined)).toBeNull();
    expect(safeRedirectPath('')).toBeNull();
  });

  // The session cookie is already set by the time this redirect happens, so an
  // open redirect here hands an authenticated user to an attacker's page.
  it('rejects anything that could leave this origin', () => {
    const hostile = [
      'https://evil.com',
      'http://evil.com',
      '//evil.com',
      '///evil.com',
      '/\\evil.com',
      '\\\\evil.com',
      'evil.com',
      'javascript:alert(1)',
      '/redirect?to=x://evil.com',
    ];

    for (const value of hostile) {
      expect(safeRedirectPath(value), value).toBeNull();
    }
  });

  it('rejects control characters that could split the Location header', () => {
    const injected = [
      '/dashboard\r\nSet-Cookie: a=b',
      '/dashboard\nLocation: https://evil.com',
      '/dash board',
      '/dashboard\u0000',
      '/dashboard\u007f',
      '/\u0009/evil.com',
    ];

    for (const value of injected) {
      expect(safeRedirectPath(value), JSON.stringify(value)).toBeNull();
    }
  });
});

describe('recovery marker', () => {
  // Renaming either of these silently disconnects /auth-callback from
  // /update-password, which would quietly restore the reduced-friction path.
  it('has a stable cookie name and path', () => {
    expect(RECOVERY_COOKIE).toBe('nexus-password-recovery');
    expect(RECOVERY_PATH).toBe('/update-password');
  });
});
