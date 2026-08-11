import { describe, expect, it } from 'vitest';
import {
  detectConflicts,
  interpretGitError,
  parseGitBranches,
  parseGitDiff,
  parseGitLog,
  parseGitStatus,
  redactCredentials,
  resolveConflict,
} from '@/lib/ide/git-parsers';

/** Build NUL-delimited porcelain output the way `git status -z` emits it. */
const z = (...records: string[]) => records.join('\u0000') + '\u0000';

describe('parseGitStatus', () => {
  it('reads the branch header with ahead/behind counts', () => {
    const result = parseGitStatus(z('## main...origin/main [ahead 2, behind 1]'));

    expect(result.branch).toBe('main');
    expect(result.upstream).toBe('origin/main');
    expect(result.ahead).toBe(2);
    expect(result.behind).toBe(1);
    expect(result.isClean).toBe(true);
  });

  it('handles a branch with no upstream', () => {
    const result = parseGitStatus(z('## feature/new-thing'));
    expect(result.branch).toBe('feature/new-thing');
    expect(result.upstream).toBeNull();
    expect(result.ahead).toBe(0);
  });

  it('detects a detached HEAD', () => {
    const result = parseGitStatus(z('## HEAD (no branch)'));
    expect(result.detached).toBe(true);
  });

  it('classifies staged, unstaged and untracked entries', () => {
    const result = parseGitStatus(
      z(
        '## main...origin/main',
        'M  staged-only.ts',
        ' M unstaged-only.ts',
        'MM both.ts',
        'A  added.ts',
        ' D deleted.ts',
        '?? untracked.ts'
      )
    );

    expect(result.files).toHaveLength(6);
    expect(result.isClean).toBe(false);

    const byPath = Object.fromEntries(result.files.map((f) => [f.path, f]));

    expect(byPath['staged-only.ts'].staged).toBe(true);
    expect(byPath['staged-only.ts'].unstaged).toBe(false);

    expect(byPath['unstaged-only.ts'].staged).toBe(false);
    expect(byPath['unstaged-only.ts'].unstaged).toBe(true);

    // A file can be both staged and further modified afterwards.
    expect(byPath['both.ts'].staged).toBe(true);
    expect(byPath['both.ts'].unstaged).toBe(true);

    expect(byPath['added.ts'].indexStatus).toBe('added');
    expect(byPath['deleted.ts'].worktreeStatus).toBe('deleted');

    expect(byPath['untracked.ts'].untracked).toBe(true);
    expect(byPath['untracked.ts'].staged).toBe(false);
  });

  // -z is used precisely so these parse correctly.
  it('handles paths containing spaces and quotes', () => {
    const result = parseGitStatus(
      z('## main', 'M  my file with spaces.md', 'M  weird "quoted" name.ts')
    );

    expect(result.files.map((f) => f.path)).toEqual([
      'my file with spaces.md',
      'weird "quoted" name.ts',
    ]);
  });

  it('reads renames with their original path', () => {
    // -z emits the new path, then the old path, as separate records.
    const result = parseGitStatus(z('## main', 'R  new-name.ts', 'old-name.ts'));

    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('new-name.ts');
    expect(result.files[0].originalPath).toBe('old-name.ts');
    expect(result.files[0].indexStatus).toBe('renamed');
  });

  it('detects merge conflicts in every conflict code', () => {
    for (const code of ['UU', 'AA', 'DD', 'AU', 'UA', 'DU', 'UD']) {
      const result = parseGitStatus(z('## main', `${code} conflicted.ts`));
      expect(result.hasConflicts, code).toBe(true);
      expect(result.files[0].conflicted, code).toBe(true);
      // A conflicted file is neither cleanly staged nor cleanly unstaged.
      expect(result.files[0].staged, code).toBe(false);
    }
  });

  it('returns a clean summary for empty output', () => {
    const result = parseGitStatus('');
    expect(result.isClean).toBe(true);
    expect(result.files).toHaveLength(0);
    expect(result.hasConflicts).toBe(false);
  });
});

describe('parseGitBranches', () => {
  it('parses local and remote branches with tracking info', () => {
    const output = [
      'main\t*\torigin/main\t[ahead 2]',
      'develop\t \torigin/develop\t',
      'feature/x\t \t\t',
      'origin/main\t \t\t',
    ].join('\n');

    const branches = parseGitBranches(output);

    expect(branches).toHaveLength(4);

    const main = branches.find((b) => b.name === 'main')!;
    expect(main.isCurrent).toBe(true);
    expect(main.upstream).toBe('origin/main');
    expect(main.ahead).toBe(2);

    expect(branches.find((b) => b.name === 'develop')!.isCurrent).toBe(false);
    expect(branches.find((b) => b.name === 'feature/x')!.upstream).toBeNull();
    expect(branches.find((b) => b.name === 'origin/main')!.isRemote).toBe(true);
  });

  it('skips the symbolic origin/HEAD pointer', () => {
    const branches = parseGitBranches('origin/HEAD\t \t\t\nmain\t*\t\t');
    expect(branches.map((b) => b.name)).toEqual(['main']);
  });

  it('flags branches whose upstream is gone', () => {
    const branches = parseGitBranches('stale\t \torigin/stale\t[gone]');
    expect(branches[0].isGone).toBe(true);
  });

  it('handles empty output', () => {
    expect(parseGitBranches('')).toEqual([]);
  });
});

describe('parseGitLog', () => {
  it('parses the tab-delimited log format', () => {
    const output = [
      'abc123def4567890\tAlice\t2 hours ago\tfix: handle nulls',
      'def456abc1234567\tBob\t3 days ago\tfeat: add thing',
    ].join('\n');

    const commits = parseGitLog(output);

    expect(commits).toHaveLength(2);
    expect(commits[0].shortHash).toBe('abc123d');
    expect(commits[0].author).toBe('Alice');
    expect(commits[0].subject).toBe('fix: handle nulls');
  });

  it('keeps tabs that appear inside the subject', () => {
    const commits = parseGitLog('abc\tAlice\tnow\tsubject\twith tab');
    expect(commits[0].subject).toBe('subject\twith tab');
  });
});

describe('parseGitDiff', () => {
  const diff = [
    'diff --git a/app/page.tsx b/app/page.tsx',
    'index 1234567..89abcde 100644',
    '--- a/app/page.tsx',
    '+++ b/app/page.tsx',
    '@@ -10,7 +10,8 @@ export default function Page() {',
    ' const a = 1;',
    '-const b = 2;',
    '+const b = 3;',
    '+const c = 4;',
    ' return null;',
  ].join('\n');

  it('extracts files, hunks and line counts', () => {
    const files = parseGitDiff(diff);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('app/page.tsx');
    expect(files[0].additions).toBe(2);
    expect(files[0].deletions).toBe(1);
    expect(files[0].hunks).toHaveLength(1);
    expect(files[0].hunks[0].heading).toBe('export default function Page() {');
  });

  it('tracks line numbers on both sides', () => {
    const lines = parseGitDiff(diff)[0].hunks[0].lines;

    const context = lines.find((l) => l.type === 'context')!;
    expect(context.oldLine).toBe(10);
    expect(context.newLine).toBe(10);

    const removed = lines.find((l) => l.type === 'removed')!;
    expect(removed.newLine).toBeNull();

    const added = lines.find((l) => l.type === 'added')!;
    expect(added.oldLine).toBeNull();
  });

  it('flags binary files instead of trying to diff them', () => {
    const files = parseGitDiff(
      'diff --git a/logo.png b/logo.png\nBinary files a/logo.png and b/logo.png differ'
    );
    expect(files[0].isBinary).toBe(true);
  });

  it('parses a multi-file diff', () => {
    const files = parseGitDiff(
      [
        'diff --git a/a.ts b/a.ts',
        '@@ -1 +1 @@',
        '-old',
        '+new',
        'diff --git a/b.ts b/b.ts',
        '@@ -1 +1 @@',
        '-x',
        '+y',
      ].join('\n')
    );
    expect(files.map((f) => f.path)).toEqual(['a.ts', 'b.ts']);
  });

  it('handles empty output', () => {
    expect(parseGitDiff('')).toEqual([]);
  });
});

describe('detectConflicts', () => {
  const conflicted = [
    'line before',
    '<<<<<<< HEAD',
    'my version',
    '=======',
    'their version',
    '>>>>>>> feature/other',
    'line after',
  ].join('\n');

  it('locates a conflict region and both sides', () => {
    const regions = detectConflicts(conflicted);

    expect(regions).toHaveLength(1);
    expect(regions[0].startLine).toBe(2);
    expect(regions[0].separatorLine).toBe(4);
    expect(regions[0].endLine).toBe(6);
    expect(regions[0].currentLabel).toBe('HEAD');
    expect(regions[0].incomingLabel).toBe('feature/other');
    expect(regions[0].currentContent).toEqual(['my version']);
    expect(regions[0].incomingContent).toEqual(['their version']);
  });

  it('finds multiple regions in one file', () => {
    const twice = `${conflicted}\n${conflicted}`;
    expect(detectConflicts(twice)).toHaveLength(2);
  });

  it('returns nothing for clean content', () => {
    expect(detectConflicts('just some code\nno markers here')).toEqual([]);
  });

  // A markdown horizontal rule is a row of '=' and must not be mistaken
  // for a conflict separator.
  it('does not treat stray separators as conflicts', () => {
    expect(detectConflicts('Title\n=======\n\nBody text')).toEqual([]);
  });
});

describe('resolveConflict', () => {
  const content = [
    'before',
    '<<<<<<< HEAD',
    'mine',
    '=======',
    'theirs',
    '>>>>>>> other',
    'after',
  ].join('\n');

  const region = detectConflicts(content)[0];

  it('keeps the current side', () => {
    expect(resolveConflict(content, region, 'current')).toBe('before\nmine\nafter');
  });

  it('keeps the incoming side', () => {
    expect(resolveConflict(content, region, 'incoming')).toBe('before\ntheirs\nafter');
  });

  it('keeps both sides in order', () => {
    expect(resolveConflict(content, region, 'both')).toBe('before\nmine\ntheirs\nafter');
  });

  it('leaves the original untouched', () => {
    resolveConflict(content, region, 'current');
    expect(content).toContain('<<<<<<< HEAD');
  });
});

describe('interpretGitError', () => {
  it('explains the failures users actually hit', () => {
    expect(interpretGitError('fatal: Authentication failed for https://github.com/x/y', 128))
      .toMatch(/authentication failed/i);

    expect(interpretGitError('remote: Repository not found.', 128)).toMatch(/not found/i);

    expect(interpretGitError('! [rejected] main -> main (non-fast-forward)', 1))
      .toMatch(/pull first/i);

    expect(interpretGitError('CONFLICT (content): Merge conflict in app/page.tsx', 1))
      .toMatch(/conflict/i);

    expect(
      interpretGitError('error: Your local changes would be overwritten by merge', 1)
    ).toMatch(/commit or discard/i);

    expect(interpretGitError('fatal: not a git repository', 128)).toMatch(/not a git repository/i);
  });

  it('returns null when nothing failed', () => {
    expect(interpretGitError('', 0)).toBeNull();
    expect(interpretGitError('Already up to date.', 0)).toBeNull();
  });

  it('falls back to a generic message for an unrecognized failure', () => {
    expect(interpretGitError('some unknown git catastrophe', 1)).toMatch(/failed/i);
  });
});

describe('redactCredentials', () => {
  // Defence in depth: git echoes URLs in several messages.
  it('removes credential material from output', () => {
    expect(redactCredentials('https://x-access-token:ghp_abc123@github.com/o/r')).not.toContain(
      'ghp_abc123'
    );
    expect(redactCredentials('Authorization: Basic eHktdG9rZW46c2VjcmV0')).not.toContain(
      'eHktdG9rZW46c2VjcmV0'
    );
    expect(redactCredentials('token ghp_0123456789abcdefghij')).not.toContain(
      'ghp_0123456789abcdefghij'
    );
    expect(
      redactCredentials('github_pat_11ABCDEFG0abcdefghijklmnop')
    ).not.toContain('github_pat_11ABCDEFG0abcdefghijklmnop');
  });

  it('leaves ordinary output alone', () => {
    const text = 'Fast-forward\n app/page.tsx | 2 +-\n 1 file changed';
    expect(redactCredentials(text)).toBe(text);
  });
});
