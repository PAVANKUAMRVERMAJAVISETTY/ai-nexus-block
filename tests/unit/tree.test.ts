import { describe, expect, it } from 'vitest';
import { buildFileTree, expansionPathsFor, flattenTree, searchFiles } from '@/lib/ide/tree';
import type { IdeFileSummary } from '@/types/ide';

function file(path: string, isDirectory = false): IdeFileSummary {
  const segments = path.split('/');
  return {
    id: `id-${path}`,
    project_id: 'p1',
    user_id: 'u1',
    file_path: path,
    filename: segments[segments.length - 1],
    parent_path: segments.slice(0, -1).join('/'),
    language: path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' : 'plaintext',
    size: 100,
    is_directory: isDirectory,
    is_binary: false,
    content_hash: null,
    origin: 'user',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

describe('buildFileTree', () => {
  it('materializes implied parent directories', () => {
    // Only the file row exists — app/ and app/api/ must still appear.
    const tree = buildFileTree([file('app/api/route.ts')]);

    expect(tree).toHaveLength(1);
    expect(tree[0].path).toBe('app');
    expect(tree[0].isDirectory).toBe(true);
    expect(tree[0].children[0].path).toBe('app/api');
    expect(tree[0].children[0].children[0].path).toBe('app/api/route.ts');
    expect(tree[0].children[0].children[0].isDirectory).toBe(false);
  });

  it('sorts directories before files, alphabetically and case-insensitively', () => {
    const tree = buildFileTree([
      file('zebra.ts'),
      file('README.md'),
      file('app/page.tsx'),
      file('Components/button.tsx'),
    ]);

    expect(tree.map((node) => node.path)).toEqual([
      'app',
      'Components',
      'README.md',
      'zebra.ts',
    ]);
  });

  it('prefers explicit directory rows over implied ones', () => {
    const tree = buildFileTree([file('app', true), file('app/page.tsx')]);

    expect(tree).toHaveLength(1);
    expect(tree[0].fileId).toBe('id-app');
    expect(tree[0].isDirectory).toBe(true);
    expect(tree[0].children).toHaveLength(1);
  });

  it('keeps empty directories', () => {
    const tree = buildFileTree([file('empty-dir', true)]);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(0);
  });

  it('handles an empty project', () => {
    expect(buildFileTree([])).toEqual([]);
  });
});

describe('flattenTree', () => {
  it('walks depth-first', () => {
    const tree = buildFileTree([file('app/page.tsx'), file('README.md')]);
    expect(flattenTree(tree)).toEqual(['app', 'app/page.tsx', 'README.md']);
  });
});

describe('expansionPathsFor', () => {
  it('lists the directories that must be open to reveal a file', () => {
    expect(expansionPathsFor('app/api/health/route.ts')).toEqual([
      'app',
      'app/api',
      'app/api/health',
    ]);
    expect(expansionPathsFor('README.md')).toEqual([]);
  });
});

describe('searchFiles', () => {
  const files = [
    file('app/page.tsx'),
    file('app/api/health/route.ts'),
    file('lib/page-utils.ts'),
    file('components/ui/button.tsx'),
    file('app', true),
  ];

  it('ranks exact and prefix filename matches above path matches', () => {
    const results = searchFiles(files, 'page');
    expect(results[0].file_path).toBe('app/page.tsx');
    expect(results.map((f) => f.file_path)).toContain('lib/page-utils.ts');
  });

  it('excludes directories', () => {
    expect(searchFiles(files, 'app').every((f) => !f.is_directory)).toBe(true);
  });

  it('is case-insensitive and returns nothing for an empty query', () => {
    expect(searchFiles(files, 'BUTTON')).toHaveLength(1);
    expect(searchFiles(files, '')).toHaveLength(0);
    expect(searchFiles(files, '   ')).toHaveLength(0);
  });

  it('returns nothing when there is no match', () => {
    expect(searchFiles(files, 'zzzznotfound')).toHaveLength(0);
  });
});
