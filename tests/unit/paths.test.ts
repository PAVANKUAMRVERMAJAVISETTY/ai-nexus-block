import { describe, expect, it } from 'vitest';
import {
  InvalidPathError,
  ancestorDirectories,
  basename,
  dirname,
  extname,
  isValidProjectPath,
  isWithin,
  joinProjectPath,
  normalizeProjectPath,
  rebasePath,
} from '@/lib/ide/paths';

describe('normalizeProjectPath', () => {
  it('accepts ordinary project paths', () => {
    expect(normalizeProjectPath('app/page.tsx')).toBe('app/page.tsx');
    expect(normalizeProjectPath('README.md')).toBe('README.md');
    expect(normalizeProjectPath('src/main/java/com/nexus/App.java')).toBe(
      'src/main/java/com/nexus/App.java'
    );
    expect(normalizeProjectPath('.env.example')).toBe('.env.example');
    expect(normalizeProjectPath('my file with spaces.md')).toBe('my file with spaces.md');
    expect(normalizeProjectPath('a-b_c.1.test.ts')).toBe('a-b_c.1.test.ts');
  });

  it('normalizes separators, duplicate slashes and leading slashes', () => {
    expect(normalizeProjectPath('/app/page.tsx')).toBe('app/page.tsx');
    expect(normalizeProjectPath('app//lib///util.ts')).toBe('app/lib/util.ts');
    expect(normalizeProjectPath('app\\lib\\util.ts')).toBe('app/lib/util.ts');
    expect(normalizeProjectPath('  app/page.tsx  ')).toBe('app/page.tsx');
    expect(normalizeProjectPath('app/lib/')).toBe('app/lib');
  });

  // The whole point of this module: none of these may ever be accepted.
  it('rejects directory traversal in every form', () => {
    const attacks = [
      '../etc/passwd',
      'app/../../etc/passwd',
      'app/./../../secret',
      '..',
      '../',
      'a/../../b',
      '....//etc/passwd'.replace('....', '..'),
      '/../root',
      'app/..',
    ];

    for (const attack of attacks) {
      expect(() => normalizeProjectPath(attack), attack).toThrow(InvalidPathError);
    }
  });

  it('rejects absolute and scheme-qualified paths', () => {
    expect(() => normalizeProjectPath('C:/Windows/System32')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('c:\\windows')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('file:///etc/passwd')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('https://evil.example.com/x')).toThrow(InvalidPathError);
  });

  it('rejects null bytes and control characters', () => {
    expect(() => normalizeProjectPath('app/page\u0000.tsx')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('app/page\u001b.tsx')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('app/pa\nge.tsx')).toThrow(InvalidPathError);
  });

  it('rejects sensitive and reserved segments', () => {
    expect(() => normalizeProjectPath('.git/config')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('app/.git/hooks/pre-commit')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('node_modules/evil/index.js')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('CON.txt')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('lpt1')).toThrow(InvalidPathError);
  });

  it('rejects characters that break shells or Windows filesystems', () => {
    for (const bad of ['a<b.ts', 'a>b.ts', 'a:b.ts', 'a"b.ts', 'a|b.ts', 'a?b.ts', 'a*b.ts']) {
      expect(() => normalizeProjectPath(bad), bad).toThrow(InvalidPathError);
    }
  });

  it('rejects empty, over-long and over-deep paths', () => {
    expect(() => normalizeProjectPath('')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('   ')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('/')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('a'.repeat(401))).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath(Array(30).fill('a').join('/'))).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath(`${'a'.repeat(121)}.ts`)).toThrow(InvalidPathError);
  });

  it('rejects segments ending in a space or period', () => {
    expect(() => normalizeProjectPath('app/page. ')).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath('app/trailing./file.ts')).toThrow(InvalidPathError);
  });

  it('rejects non-string input', () => {
    expect(() => normalizeProjectPath(undefined)).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath(null)).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath(42)).toThrow(InvalidPathError);
    expect(() => normalizeProjectPath({ path: 'a.ts' })).toThrow(InvalidPathError);
  });
});

describe('isValidProjectPath', () => {
  it('mirrors normalizeProjectPath without throwing', () => {
    expect(isValidProjectPath('app/page.tsx')).toBe(true);
    expect(isValidProjectPath('../escape')).toBe(false);
    expect(isValidProjectPath(null)).toBe(false);
  });
});

describe('path helpers', () => {
  it('splits paths correctly', () => {
    expect(basename('app/api/health/route.ts')).toBe('route.ts');
    expect(basename('README.md')).toBe('README.md');
    expect(dirname('app/api/health/route.ts')).toBe('app/api/health');
    expect(dirname('README.md')).toBe('');
    expect(extname('app/page.tsx')).toBe('tsx');
    expect(extname('Dockerfile')).toBe('');
    expect(extname('.gitignore')).toBe('');
    expect(extname('archive.tar.gz')).toBe('gz');
  });

  it('joins and validates in one step', () => {
    expect(joinProjectPath('app/lib', 'util.ts')).toBe('app/lib/util.ts');
    expect(joinProjectPath('', 'util.ts')).toBe('util.ts');
    expect(() => joinProjectPath('app', '../../etc/passwd')).toThrow(InvalidPathError);
  });

  it('lists ancestor directories shallowest first', () => {
    expect(ancestorDirectories('app/api/health/route.ts')).toEqual([
      'app',
      'app/api',
      'app/api/health',
    ]);
    expect(ancestorDirectories('README.md')).toEqual([]);
  });

  it('computes containment without prefix confusion', () => {
    expect(isWithin('app', 'app/page.tsx')).toBe(true);
    expect(isWithin('app', 'app')).toBe(true);
    // "application" must not be treated as living inside "app".
    expect(isWithin('app', 'application/page.tsx')).toBe(false);
    expect(isWithin('', 'anything')).toBe(true);
  });

  it('rebases descendants when a directory is renamed', () => {
    expect(rebasePath('app/page.tsx', 'app', 'src')).toBe('src/page.tsx');
    expect(rebasePath('app', 'app', 'src')).toBe('src');
    expect(rebasePath('lib/util.ts', 'app', 'src')).toBe('lib/util.ts');
    expect(rebasePath('app/a/b.ts', 'app/a', 'x/y')).toBe('x/y/b.ts');
  });
});
