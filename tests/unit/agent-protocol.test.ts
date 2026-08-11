import { describe, expect, it } from 'vitest';
import {
  UnsafeCommandError,
  classifyCommand,
  parseBearerToken,
  tokenizeCommand,
  validateCommand,
} from '@/lib/ide/agent-protocol';

describe('tokenizeCommand', () => {
  it('splits on whitespace', () => {
    expect(tokenizeCommand('npm run build')).toEqual(['npm', 'run', 'build']);
    expect(tokenizeCommand('  npm   run   build  ')).toEqual(['npm', 'run', 'build']);
  });

  it('honours quotes', () => {
    expect(tokenizeCommand('git commit -m "fix the bug"')).toEqual([
      'git',
      'commit',
      '-m',
      'fix the bug',
    ]);
    expect(tokenizeCommand("npm run 'my script'")).toEqual(['npm', 'run', 'my script']);
    expect(tokenizeCommand('git commit -m ""')).toEqual(['git', 'commit', '-m', '']);
  });

  it('rejects an unterminated quote rather than guessing', () => {
    expect(() => tokenizeCommand('git commit -m "unterminated')).toThrow(UnsafeCommandError);
  });
});

describe('validateCommand', () => {
  it('accepts allow-listed commands', () => {
    for (const command of [
      'npm run build',
      'npm install',
      'git status',
      'node script.js',
      'pytest',
      'mvn test',
      'go build',
      'tsc --noEmit',
    ]) {
      expect(() => validateCommand(command), command).not.toThrow();
    }
  });

  // Command injection is the highest-severity risk in the whole subsystem.
  it('rejects shell metacharacters in every form', () => {
    const injections = [
      'npm run build; rm -rf /',
      'npm run build && curl evil.example.com',
      'npm run build | sh',
      'npm run build || whoami',
      'echo `whoami`',
      'npm run $(whoami)',
      'npm run build > /etc/passwd',
      'npm run build < /etc/shadow',
      'npm run build\nrm -rf /',
      'npm run ${IFS}evil',
      'npm run build & sleep 100',
    ];

    for (const injection of injections) {
      expect(() => validateCommand(injection), injection).toThrow(UnsafeCommandError);
    }
  });

  it('rejects programs that are not on the allowlist', () => {
    for (const command of ['rm -rf /', 'curl evil.example.com', 'wget x', 'bash -c ls', 'sh']) {
      expect(() => validateCommand(command), command).toThrow(UnsafeCommandError);
    }
  });

  it('rejects paths used to sidestep the allowlist', () => {
    expect(() => validateCommand('/usr/bin/npm run build')).toThrow(UnsafeCommandError);
    expect(() => validateCommand('./npm run build')).toThrow(UnsafeCommandError);
    expect(() => validateCommand('../../bin/npm install')).toThrow(UnsafeCommandError);
  });

  it('rejects traversal in arguments', () => {
    expect(() => validateCommand('node ../../../etc/passwd')).toThrow(UnsafeCommandError);
  });

  it('rejects empty, over-long and non-string commands', () => {
    expect(() => validateCommand('')).toThrow(UnsafeCommandError);
    expect(() => validateCommand('   ')).toThrow(UnsafeCommandError);
    expect(() => validateCommand(`npm run ${'a'.repeat(600)}`)).toThrow(UnsafeCommandError);
    expect(() => validateCommand(undefined)).toThrow(UnsafeCommandError);
    expect(() => validateCommand(123)).toThrow(UnsafeCommandError);
  });

  it('flags elevated commands for a second confirmation', () => {
    expect(validateCommand('git push origin main').requiresElevatedConfirmation).toBe(true);
    expect(validateCommand('git reset --hard HEAD').requiresElevatedConfirmation).toBe(true);
    expect(validateCommand('npm publish').requiresElevatedConfirmation).toBe(true);
    expect(validateCommand('npm run build').requiresElevatedConfirmation).toBe(false);
    expect(validateCommand('git status').requiresElevatedConfirmation).toBe(false);
  });

  it('returns argv suitable for a shell-free spawn', () => {
    const result = validateCommand('git commit -m "add tests"');
    expect(result.argv).toEqual(['git', 'commit', '-m', 'add tests']);
    expect(result.binary).toBe('git');
  });
});

describe('classifyCommand', () => {
  it('maps commands to run kinds', () => {
    expect(classifyCommand(['npm', 'install'])).toBe('install');
    expect(classifyCommand(['npm', 'ci'])).toBe('install');
    expect(classifyCommand(['npm', 'run', 'build'])).toBe('build');
    expect(classifyCommand(['npm', 'run', 'test'])).toBe('test');
    expect(classifyCommand(['npm', 'run', 'typecheck'])).toBe('typecheck');
    expect(classifyCommand(['npm', 'run', 'lint'])).toBe('lint');
    expect(classifyCommand(['npm', 'run', 'dev'])).toBe('dev');
    expect(classifyCommand(['git', 'status'])).toBe('git');
    expect(classifyCommand(['tsc', '--noEmit'])).toBe('typecheck');
    expect(classifyCommand(['pytest'])).toBe('test');
    expect(classifyCommand(['make'])).toBe('custom');
  });
});

describe('parseBearerToken', () => {
  it('extracts a bearer token', () => {
    expect(parseBearerToken('Bearer nxa_abc123')).toBe('nxa_abc123');
    expect(parseBearerToken('bearer nxa_abc123')).toBe('nxa_abc123');
    expect(parseBearerToken('  Bearer   nxa_abc123  ')).toBe('nxa_abc123');
  });

  it('returns null for anything else', () => {
    expect(parseBearerToken(null)).toBeNull();
    expect(parseBearerToken('')).toBeNull();
    expect(parseBearerToken('nxa_abc123')).toBeNull();
    expect(parseBearerToken('Basic dXNlcjpwYXNz')).toBeNull();
    expect(parseBearerToken('Bearer ')).toBeNull();
  });
});
