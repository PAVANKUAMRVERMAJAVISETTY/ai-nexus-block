import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DecryptionFailedError,
  EncryptionUnavailableError,
  decryptSecret,
  encryptSecret,
  isEncryptionConfigured,
  tokenFingerprint,
} from '@/lib/security/crypto';

// A deterministic 32-byte key for the tests. Not a real secret.
const TEST_KEY = Buffer.alloc(32, 7).toString('base64');
const OTHER_KEY = Buffer.alloc(32, 9).toString('base64');

let original: string | undefined;

beforeEach(() => {
  original = process.env.NEXUS_ENCRYPTION_KEY;
  process.env.NEXUS_ENCRYPTION_KEY = TEST_KEY;
});

afterEach(() => {
  if (original === undefined) delete process.env.NEXUS_ENCRYPTION_KEY;
  else process.env.NEXUS_ENCRYPTION_KEY = original;
});

describe('encryptSecret / decryptSecret', () => {
  it('round-trips a token', () => {
    const token = 'ghp_exampleTokenValue1234567890';
    expect(decryptSecret(encryptSecret(token))).toBe(token);
  });

  it('never stores the plaintext in the ciphertext', () => {
    const token = 'ghp_exampleTokenValue1234567890';
    expect(encryptSecret(token)).not.toContain(token);
    expect(encryptSecret(token)).not.toContain('ghp_');
  });

  // A fresh IV per encryption means identical inputs look unrelated at rest.
  it('produces different ciphertext each time', () => {
    const token = 'same-token';
    expect(encryptSecret(token)).not.toBe(encryptSecret(token));
  });

  it('emits a versioned, parseable envelope', () => {
    const parts = encryptSecret('x').split('.');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('v1');
  });

  it('handles unicode and long values', () => {
    const unicode = 'tökén-日本語-🔐';
    expect(decryptSecret(encryptSecret(unicode))).toBe(unicode);

    const long = 'a'.repeat(10_000);
    expect(decryptSecret(encryptSecret(long))).toBe(long);
  });

  // GCM is authenticated: tampering must fail loudly, not decrypt to garbage.
  it('rejects tampered ciphertext', () => {
    const encrypted = encryptSecret('secret-value');
    const parts = encrypted.split('.');

    const flipped = Buffer.from(parts[3], 'base64url');
    flipped[0] = flipped[0] ^ 0xff;
    parts[3] = flipped.toString('base64url');

    expect(() => decryptSecret(parts.join('.'))).toThrow(DecryptionFailedError);
  });

  it('rejects a tampered auth tag', () => {
    const parts = encryptSecret('secret-value').split('.');
    const tag = Buffer.from(parts[2], 'base64url');
    tag[0] = tag[0] ^ 0xff;
    parts[2] = tag.toString('base64url');

    expect(() => decryptSecret(parts.join('.'))).toThrow(DecryptionFailedError);
  });

  it('rejects ciphertext encrypted under a different key', () => {
    const encrypted = encryptSecret('secret-value');
    process.env.NEXUS_ENCRYPTION_KEY = OTHER_KEY;
    expect(() => decryptSecret(encrypted)).toThrow(DecryptionFailedError);
  });

  it('rejects malformed input', () => {
    for (const bad of ['', 'not-encrypted', 'v1.only.three', 'v2.a.b.c']) {
      expect(() => decryptSecret(bad), bad).toThrow(DecryptionFailedError);
    }
  });

  it('refuses to encrypt an empty value', () => {
    expect(() => encryptSecret('')).toThrow();
  });
});

describe('key configuration', () => {
  it('reports missing configuration rather than encrypting weakly', () => {
    delete process.env.NEXUS_ENCRYPTION_KEY;
    expect(isEncryptionConfigured()).toBe(false);
    expect(() => encryptSecret('x')).toThrow(EncryptionUnavailableError);
  });

  // A 16-byte key would silently weaken every stored token.
  it('rejects a key of the wrong length', () => {
    process.env.NEXUS_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64');
    expect(isEncryptionConfigured()).toBe(false);
    expect(() => encryptSecret('x')).toThrow(/32 bytes/);
  });

  it('accepts a hex-encoded key as well as base64', () => {
    process.env.NEXUS_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('hex');
    expect(isEncryptionConfigured()).toBe(true);
    expect(decryptSecret(encryptSecret('hex-key-works'))).toBe('hex-key-works');
  });
});

describe('tokenFingerprint', () => {
  it('is stable and reveals nothing about the token', () => {
    const token = 'ghp_exampleTokenValue1234567890';
    const fingerprint = tokenFingerprint(token);

    expect(fingerprint).toBe(tokenFingerprint(token));
    expect(fingerprint).toHaveLength(8);
    expect(token).not.toContain(fingerprint);
  });

  it('differs between tokens', () => {
    expect(tokenFingerprint('token-a')).not.toBe(tokenFingerprint('token-b'));
  });
});
