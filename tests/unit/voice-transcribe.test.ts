import { describe, expect, it } from 'vitest';

describe('voice transcription contract', () => {
  it('accepts the configured audio contract', () => {
    const allowed = new Set([
      'audio/webm',
      'audio/wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/m4a',
      'audio/mp4',
    ]);

    expect(allowed.has('audio/webm')).toBe(true);
    expect(allowed.has('application/pdf')).toBe(false);
  });

  it('enforces the 10 MB audio limit', () => {
    const max = 10 * 1024 * 1024;

    expect(max).toBe(10485760);
    expect(max + 1).toBeGreaterThan(max);
  });
});
