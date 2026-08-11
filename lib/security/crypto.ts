/**
 * Authenticated encryption for credentials at rest.
 *
 * GitHub access tokens are stored in Supabase. Row Level Security already stops
 * one user reading another's row, but a database dump, a backup, or a mistaken
 * service-role query would otherwise expose usable tokens in plaintext. These
 * helpers keep the ciphertext in the database and the key in the environment,
 * so possession of the database alone is not enough to use the tokens.
 *
 * AES-256-GCM: authenticated, so tampering is detected rather than silently
 * decrypting to garbage. A fresh random IV per encryption means encrypting the
 * same token twice produces different ciphertext.
 *
 * SERVER ONLY. Importing this from a client component would ship the key.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV, the size GCM is specified for
const KEY_LENGTH = 32; // 256-bit key
const AUTH_TAG_LENGTH = 16;

export class EncryptionUnavailableError extends Error {
  constructor() {
    super(
      'NEXUS_ENCRYPTION_KEY is not configured. Generate one with ' +
        '`openssl rand -base64 32` and set it in the server environment. ' +
        'GitHub connections cannot be stored without it.'
    );
    this.name = 'EncryptionUnavailableError';
  }
}

export class DecryptionFailedError extends Error {
  constructor() {
    // Deliberately vague: distinguishing "wrong key" from "tampered data"
    // would leak information to anyone probing the endpoint.
    super('Stored credential could not be decrypted. Reconnect GitHub.');
    this.name = 'DecryptionFailedError';
  }
}

function getKey(): Buffer {
  const raw = process.env.NEXUS_ENCRYPTION_KEY;
  if (!raw) throw new EncryptionUnavailableError();

  // Accept base64 (the documented form) or hex, and validate the length —
  // a short key would silently weaken every token in the database.
  let key: Buffer;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    key = Buffer.from(raw, 'base64');
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `NEXUS_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}). ` +
        'Generate one with `openssl rand -base64 32`.'
    );
  }

  return key;
}

export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encrypt a secret.
 * Returns `v1.<iv>.<authTag>.<ciphertext>`, all base64url — a single opaque
 * string that is safe to store in one text column and carries its own version
 * prefix so the scheme can be rotated later.
 */
export function encryptSecret(plaintext: string): string {
  if (typeof plaintext !== 'string' || !plaintext) {
    throw new Error('Cannot encrypt an empty value.');
  }

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

/** Decrypt a value produced by `encryptSecret`. */
export function decryptSecret(encoded: string): string {
  if (typeof encoded !== 'string' || !encoded) throw new DecryptionFailedError();

  const parts = encoded.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') throw new DecryptionFailedError();

  try {
    const key = getKey();
    const iv = Buffer.from(parts[1], 'base64url');
    const authTag = Buffer.from(parts[2], 'base64url');
    const ciphertext = Buffer.from(parts[3], 'base64url');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new DecryptionFailedError();
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // `final()` throws if the auth tag does not verify.
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (error) {
    if (error instanceof EncryptionUnavailableError) throw error;
    throw new DecryptionFailedError();
  }
}

/**
 * Non-secret fingerprint of a token, for logs and audit rows.
 * Lets you correlate "which credential was used" without storing the credential.
 */
export function tokenFingerprint(token: string): string {
  const bytes = Buffer.from(token, 'utf8');
  let hash = 0;
  // Indexed loop: this project targets ES5, where iterating a Buffer needs
  // downlevelIteration.
  for (let i = 0; i < bytes.length; i += 1) {
    hash = (hash * 31 + bytes[i]) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
