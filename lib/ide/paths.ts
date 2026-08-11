/**
 * Path safety for the Nexus IDE virtual filesystem.
 *
 * Every path that arrives from a browser, from the AI assistant, or from a
 * repository import is funnelled through `normalizeProjectPath` before it
 * reaches the database or the local agent. Paths are project-relative POSIX
 * paths with no leading slash, no `.` / `..` segments, no drive letters, no
 * backslashes and no NUL bytes.
 *
 * This module is pure and has no I/O, so it is safe to use on both sides of
 * the network boundary.
 */

export const MAX_PATH_LENGTH = 400;
export const MAX_PATH_DEPTH = 24;
export const MAX_SEGMENT_LENGTH = 120;

export class InvalidPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPathError';
  }
}

/** Segments that must never appear anywhere in a project path. */
const FORBIDDEN_SEGMENTS = new Set(['.', '..', '.git', 'node_modules']);

/** Windows device names that are unsafe as filenames when the agent materializes files. */
const RESERVED_BASENAMES = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

/**
 * Normalize an untrusted path into a canonical project-relative path.
 * Throws `InvalidPathError` rather than silently repairing anything that
 * could change which file is addressed.
 */
export function normalizeProjectPath(input: unknown): string {
  if (typeof input !== 'string') {
    throw new InvalidPathError('Path must be a string.');
  }

  if (input.includes('\0')) {
    throw new InvalidPathError('Path must not contain null bytes.');
  }

  // Collapse Windows separators and redundant slashes, then trim edges.
  const collapsed = input.replace(/\\/g, '/').replace(/\/+/g, '/');
  const trimmed = collapsed.replace(/^\/+/, '').replace(/\/+$/, '').trim();

  if (!trimmed) {
    throw new InvalidPathError('Path must not be empty.');
  }

  if (trimmed.length > MAX_PATH_LENGTH) {
    throw new InvalidPathError(`Path exceeds ${MAX_PATH_LENGTH} characters.`);
  }

  // Reject absolute Windows paths and URL-ish schemes outright.
  if (/^[a-zA-Z]:/.test(trimmed) || /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    throw new InvalidPathError('Path must be relative to the project root.');
  }

  const segments = trimmed.split('/');

  if (segments.length > MAX_PATH_DEPTH) {
    throw new InvalidPathError(`Path exceeds a depth of ${MAX_PATH_DEPTH} directories.`);
  }

  for (const segment of segments) {
    if (!segment) {
      throw new InvalidPathError('Path must not contain empty segments.');
    }
    if (segment.length > MAX_SEGMENT_LENGTH) {
      throw new InvalidPathError(`Path segment "${segment.slice(0, 24)}…" is too long.`);
    }
    if (FORBIDDEN_SEGMENTS.has(segment.toLowerCase())) {
      throw new InvalidPathError(`Path segment "${segment}" is not allowed.`);
    }
    // Control characters and characters that break shells or Windows filesystems.
    if (/[\u0000-\u001f<>:"|?*]/.test(segment)) {
      throw new InvalidPathError(`Path segment "${segment}" contains illegal characters.`);
    }
    if (segment.endsWith(' ') || segment.endsWith('.')) {
      throw new InvalidPathError('Path segments must not end with a space or period.');
    }
    const stem = segment.split('.')[0]?.toLowerCase() ?? '';
    if (RESERVED_BASENAMES.has(stem)) {
      throw new InvalidPathError(`"${segment}" is a reserved filename.`);
    }
  }

  return segments.join('/');
}

/** `true` when the path is safe, without throwing. */
export function isValidProjectPath(input: unknown): boolean {
  try {
    normalizeProjectPath(input);
    return true;
  } catch {
    return false;
  }
}

/** Last segment of a path. */
export function basename(path: string): string {
  const segments = path.split('/');
  return segments[segments.length - 1] ?? path;
}

/** Parent directory of a path, or `''` for a root-level entry. */
export function dirname(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
}

/** File extension without the dot, lowercased. `''` when there is none. */
export function extname(path: string): string {
  const name = basename(path);
  const index = name.lastIndexOf('.');
  if (index <= 0) return '';
  return name.slice(index + 1).toLowerCase();
}

/** Join a parent directory and a child name into a normalized path. */
export function joinProjectPath(parent: string, child: string): string {
  const combined = parent ? `${parent}/${child}` : child;
  return normalizeProjectPath(combined);
}

/** Every ancestor directory of a path, shallowest first. */
export function ancestorDirectories(path: string): string[] {
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

/** `true` when `path` is `dir` itself or lives underneath it. */
export function isWithin(dir: string, path: string): boolean {
  if (!dir) return true;
  return path === dir || path.startsWith(`${dir}/`);
}

/**
 * Rewrite a path that lives under `fromDir` so it lives under `toDir`.
 * Used when renaming a directory.
 */
export function rebasePath(path: string, fromDir: string, toDir: string): string {
  if (path === fromDir) return toDir;
  if (!isWithin(fromDir, path)) return path;
  const suffix = path.slice(fromDir.length + 1);
  return toDir ? `${toDir}/${suffix}` : suffix;
}
