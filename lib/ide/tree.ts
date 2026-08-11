/**
 * Builds the explorer tree from the flat file rows stored in Supabase.
 *
 * Directories are materialized from two sources: explicit directory rows, and
 * implied parents of file paths. That means a file created at
 * `app/api/health/route.ts` produces `app`, `app/api` and `app/api/health`
 * nodes even if no directory row exists for them.
 */

import type { IdeFileSummary, IdeTreeNode } from '@/types/ide';
import { basename } from './paths';

function createNode(path: string, isDirectory: boolean): IdeTreeNode {
  return {
    path,
    name: basename(path),
    isDirectory,
    language: 'plaintext',
    size: 0,
    fileId: null,
    children: [],
  };
}

/** Directories first, then files, each alphabetical and case-insensitive. */
function sortNodes(nodes: IdeTreeNode[]): void {
  nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  for (const node of nodes) {
    if (node.children.length) sortNodes(node.children);
  }
}

export function buildFileTree(files: IdeFileSummary[]): IdeTreeNode[] {
  const roots: IdeTreeNode[] = [];
  const index = new Map<string, IdeTreeNode>();

  /** Get or create the directory node for `path`, creating ancestors as needed. */
  function ensureDirectory(path: string): IdeTreeNode | null {
    if (!path) return null;

    const existing = index.get(path);
    if (existing) {
      // A path first seen as an implied parent may later get a real row.
      existing.isDirectory = true;
      return existing;
    }

    const node = createNode(path, true);
    index.set(path, node);

    const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    const parent = ensureDirectory(parentPath);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
    return node;
  }

  // Explicit directory rows first, so their metadata wins over implied nodes.
  for (const file of files) {
    if (file.is_directory) {
      const node = ensureDirectory(file.file_path);
      if (node) node.fileId = file.id;
    }
  }

  for (const file of files) {
    if (file.is_directory) continue;

    const parentPath = file.file_path.includes('/')
      ? file.file_path.slice(0, file.file_path.lastIndexOf('/'))
      : '';

    const node = createNode(file.file_path, false);
    node.language = file.language;
    node.size = file.size;
    node.fileId = file.id;
    index.set(file.file_path, node);

    const parent = ensureDirectory(parentPath);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortNodes(roots);
  return roots;
}

/** Flatten a tree back into paths, depth-first, directories included. */
export function flattenTree(nodes: IdeTreeNode[]): string[] {
  const result: string[] = [];
  const walk = (list: IdeTreeNode[]) => {
    for (const node of list) {
      result.push(node.path);
      if (node.children.length) walk(node.children);
    }
  };
  walk(nodes);
  return result;
}

/** Every directory path that should be expanded to reveal `path`. */
export function expansionPathsFor(path: string): string[] {
  const segments = path.split('/');
  segments.pop();
  const result: string[] = [];
  let current = '';
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    result.push(current);
  }
  return result;
}

/** Case-insensitive substring match over paths, ranked by where the hit lands. */
export function searchFiles(files: IdeFileSummary[], query: string, limit = 50): IdeFileSummary[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const scored: { file: IdeFileSummary; score: number }[] = [];

  for (const file of files) {
    if (file.is_directory) continue;
    const path = file.file_path.toLowerCase();
    const name = file.filename.toLowerCase();

    let score = -1;
    if (name === needle) score = 0;
    else if (name.startsWith(needle)) score = 1;
    else if (name.includes(needle)) score = 2;
    else if (path.includes(needle)) score = 3;

    if (score >= 0) scored.push({ file, score });
  }

  scored.sort((a, b) => a.score - b.score || a.file.file_path.localeCompare(b.file.file_path));
  return scored.slice(0, limit).map((entry) => entry.file);
}
