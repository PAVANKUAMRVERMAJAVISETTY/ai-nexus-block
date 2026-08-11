import { describe, expect, it } from 'vitest';
import {
  ELEVATED_GIT_OPERATIONS,
  InvalidGitOperationError,
  buildGitArgv,
  describeGitOperation,
  elevatedWarning,
  isElevatedOperation,
  requiresCredential,
  validateBranchName,
  validateCommitMessage,
  validateGitOperation,
  validatePaths,
  validateRepoUrl,
} from '@/lib/ide/git-protocol';

describe('validateCommitMessage', () => {
  // The reason this protocol exists: these all fail the shell-command
  // validator, but they are perfectly ordinary commit messages.
  it('preserves shell metacharacters verbatim', () => {
    const realistic = [
      'fix: handle A & B',
      'feat(api): add /users; refactor tests',
      'fix $HOME expansion in script',
      'use `useEffect` correctly',
      'fix bug (see #42) | cleanup',
      'chore: bump deps > 2.0',
      'fix: don\'t crash on "null"',
      'revert: 100% of the change',
    ];

    for (const message of realistic) {
      expect(validateCommitMessage(message), message).toBe(message);
    }
  });

  it('keeps multi-line messages intact', () => {
    const message = 'feat: add thing\n\nLonger explanation.\n- point one\n- point two';
    expect(validateCommitMessage(message)).toBe(message);
  });

  it('trims surrounding whitespace', () => {
    expect(validateCommitMessage('  fix: thing  ')).toBe('fix: thing');
  });

  it('rejects empty, oversized and non-string messages', () => {
    expect(() => validateCommitMessage('')).toThrow(InvalidGitOperationError);
    expect(() => validateCommitMessage('   ')).toThrow(InvalidGitOperationError);
    expect(() => validateCommitMessage('x'.repeat(5001))).toThrow(InvalidGitOperationError);
    expect(() => validateCommitMessage(null)).toThrow(InvalidGitOperationError);
    expect(() => validateCommitMessage(42)).toThrow(InvalidGitOperationError);
  });

  it('rejects null bytes', () => {
    expect(() => validateCommitMessage('fix\u0000thing')).toThrow(InvalidGitOperationError);
  });
});

describe('validateBranchName', () => {
  it('accepts ordinary branch names', () => {
    for (const branch of ['main', 'develop', 'feature/login', 'fix-123', 'release/v1.2.0', 'user/my.branch']) {
      expect(validateBranchName(branch), branch).toBe(branch);
    }
  });

  // A branch called "-D" or "--force" would otherwise be read as a flag.
  it('rejects names that could be parsed as options', () => {
    expect(() => validateBranchName('-D')).toThrow(InvalidGitOperationError);
    expect(() => validateBranchName('--force')).toThrow(InvalidGitOperationError);
    expect(() => validateBranchName('--upload-pack=evil')).toThrow(InvalidGitOperationError);
  });

  it("enforces git's own ref rules", () => {
    for (const bad of [
      'has space', 'has~tilde', 'has^caret', 'has:colon', 'has?question',
      'has*star', 'has[bracket', 'has\\backslash', 'double..dot', 'trailing.',
      'ends.lock', '/leading', 'trailing/', 'double//slash', 'at@{brace',
    ]) {
      expect(() => validateBranchName(bad), bad).toThrow(InvalidGitOperationError);
    }
  });

  it('rejects empty and oversized names', () => {
    expect(() => validateBranchName('')).toThrow(InvalidGitOperationError);
    expect(() => validateBranchName('a'.repeat(256))).toThrow(InvalidGitOperationError);
    expect(() => validateBranchName(undefined)).toThrow(InvalidGitOperationError);
  });
});

describe('validateRepoUrl', () => {
  it('normalizes valid GitHub URLs', () => {
    expect(validateRepoUrl('https://github.com/owner/repo')).toBe('https://github.com/owner/repo.git');
    expect(validateRepoUrl('https://github.com/owner/repo.git')).toBe('https://github.com/owner/repo.git');
    expect(validateRepoUrl('https://github.com/owner/repo/')).toBe('https://github.com/owner/repo.git');
  });

  it('rejects non-GitHub and non-HTTPS hosts', () => {
    for (const url of [
      'http://github.com/owner/repo',
      'https://evil.example.com/owner/repo',
      'git@github.com:owner/repo.git',
      'ssh://github.com/owner/repo',
      'file:///etc/passwd',
      'https://github.com.evil.com/owner/repo',
    ]) {
      expect(() => validateRepoUrl(url), url).toThrow(InvalidGitOperationError);
    }
  });

  // A URL like https://user:token@github.com/... would persist the token
  // into .git/config on the user's disk.
  it('rejects URLs with embedded credentials', () => {
    expect(() => validateRepoUrl('https://user:ghp_secret@github.com/owner/repo')).toThrow(
      InvalidGitOperationError
    );
  });

  it('rejects malformed paths', () => {
    expect(() => validateRepoUrl('https://github.com/owner')).toThrow(InvalidGitOperationError);
    expect(() => validateRepoUrl('https://github.com/a/b/c')).toThrow(InvalidGitOperationError);
    expect(() => validateRepoUrl('')).toThrow(InvalidGitOperationError);
  });
});

describe('validatePaths', () => {
  it('normalizes valid project paths', () => {
    expect(validatePaths(['app/page.tsx', 'lib/util.ts'])).toEqual(['app/page.tsx', 'lib/util.ts']);
  });

  it('rejects traversal and unsafe paths', () => {
    expect(() => validatePaths(['../../etc/passwd'])).toThrow(InvalidGitOperationError);
    expect(() => validatePaths(['.git/config'])).toThrow(InvalidGitOperationError);
  });

  it('rejects empty and oversized lists', () => {
    expect(() => validatePaths([])).toThrow(InvalidGitOperationError);
    expect(() => validatePaths('nope')).toThrow(InvalidGitOperationError);
    expect(() => validatePaths(Array(501).fill('a.ts'))).toThrow(InvalidGitOperationError);
  });
});

describe('validateGitOperation', () => {
  it('accepts each supported operation', () => {
    expect(validateGitOperation({ op: 'status' })).toEqual({ op: 'status' });
    expect(validateGitOperation({ op: 'commit', message: 'fix: a & b' })).toEqual({
      op: 'commit',
      message: 'fix: a & b',
    });
    expect(validateGitOperation({ op: 'branch_switch', branch: 'main' })).toEqual({
      op: 'branch_switch',
      branch: 'main',
    });
  });

  it('rejects unknown operations', () => {
    expect(() => validateGitOperation({ op: 'rm_rf' })).toThrow(InvalidGitOperationError);
    expect(() => validateGitOperation({ op: 'exec', cmd: 'whoami' })).toThrow(InvalidGitOperationError);
    expect(() => validateGitOperation({})).toThrow(InvalidGitOperationError);
    expect(() => validateGitOperation(null)).toThrow(InvalidGitOperationError);
    expect(() => validateGitOperation('status')).toThrow(InvalidGitOperationError);
  });

  it('validates nested fields rather than trusting them', () => {
    expect(() => validateGitOperation({ op: 'commit', message: '' })).toThrow(InvalidGitOperationError);
    expect(() => validateGitOperation({ op: 'branch_create', branch: '-x' })).toThrow(InvalidGitOperationError);
    expect(() => validateGitOperation({ op: 'stage', paths: ['../escape'] })).toThrow(InvalidGitOperationError);
    expect(() => validateGitOperation({ op: 'clone', repoUrl: 'https://evil.com/a/b' })).toThrow(InvalidGitOperationError);
  });

  it('strips any credential a caller tries to inject', () => {
    const result = validateGitOperation({
      op: 'push',
      branch: 'main',
      credential: { username: 'x', token: 'ghp_attacker' },
    });
    // Credentials are attached server-side at hand-off, never accepted as input.
    expect((result as unknown as Record<string, unknown>).credential).toBeUndefined();
  });
});

describe('buildGitArgv', () => {
  it('puts the commit message in its own argv element, unescaped', () => {
    const argv = buildGitArgv({ op: 'commit', message: 'fix: A & B; drop table' });
    expect(argv).toEqual(['commit', '-m', 'fix: A & B; drop table']);
    // Exactly three elements means nothing was split on the metacharacters.
    expect(argv).toHaveLength(3);
  });

  it('separates options from pathspecs with --', () => {
    expect(buildGitArgv({ op: 'stage', paths: ['app/page.tsx'] })).toEqual([
      'add', '--', 'app/page.tsx',
    ]);
    expect(buildGitArgv({ op: 'discard', paths: ['a.ts', 'b.ts'] })).toEqual([
      'checkout', '--', 'a.ts', 'b.ts',
    ]);
  });

  it('builds machine-readable status and branch commands', () => {
    const status = buildGitArgv({ op: 'status' });
    expect(status).toContain('--porcelain=v1');
    expect(status).toContain('-z');
    expect(status).toContain('--branch');

    expect(buildGitArgv({ op: 'branch_list' }).join(' ')).toContain('--format=');
  });

  it('uses -d by default and -D only when forced', () => {
    expect(buildGitArgv({ op: 'branch_delete', branch: 'old' })).toContain('-d');
    expect(buildGitArgv({ op: 'branch_delete', branch: 'old', force: true })).toContain('-D');
  });

  it('pulls fast-forward only, so a surprise merge commit is impossible', () => {
    expect(buildGitArgv({ op: 'pull' })).toContain('--ff-only');
  });

  it('never embeds a credential in argv', () => {
    const argv = buildGitArgv({
      op: 'clone',
      repoUrl: 'https://github.com/owner/repo.git',
      credential: { username: 'x-access-token', token: 'ghp_secret' },
    });
    expect(argv.join(' ')).not.toContain('ghp_secret');
    expect(argv.join(' ')).not.toContain('x-access-token');
  });
});

describe('elevation', () => {
  it('marks destructive operations as elevated', () => {
    expect(isElevatedOperation('push')).toBe(true);
    expect(isElevatedOperation('discard')).toBe(true);
    expect(isElevatedOperation('branch_delete')).toBe(true);

    expect(isElevatedOperation('status')).toBe(false);
    expect(isElevatedOperation('commit')).toBe(false);
    expect(isElevatedOperation('diff')).toBe(false);
  });

  it('only requests credentials for operations that reach the remote', () => {
    for (const op of ['clone', 'push', 'pull', 'fetch'] as const) {
      expect(requiresCredential(op), op).toBe(true);
    }
    for (const op of ['status', 'commit', 'stage', 'diff', 'branch_list'] as const) {
      expect(requiresCredential(op), op).toBe(false);
    }
  });

  it('warns specifically about data loss', () => {
    const discard = elevatedWarning({ op: 'discard', paths: ['a.ts', 'b.ts'] });
    expect(discard).toMatch(/cannot be recovered/i);

    const forceDelete = elevatedWarning({ op: 'branch_delete', branch: 'x', force: true });
    expect(forceDelete).toMatch(/not merged/i);

    expect(elevatedWarning({ op: 'status' })).toBeNull();
  });

  it('keeps the elevated set aligned with the warnings', () => {
    for (const op of Array.from(ELEVATED_GIT_OPERATIONS)) {
      expect(isElevatedOperation(op)).toBe(true);
    }
  });
});

describe('describeGitOperation', () => {
  it('produces a readable label without leaking the full message', () => {
    expect(describeGitOperation({ op: 'commit', message: 'fix: thing\n\nbody' })).toBe(
      'git commit -m "fix: thing"'
    );
    expect(describeGitOperation({ op: 'push', branch: 'main' })).toBe('git push origin main');
    expect(describeGitOperation({ op: 'status' })).toBe('git status');
  });
});
