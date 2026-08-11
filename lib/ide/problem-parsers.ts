/**
 * Turn raw command output into normalized diagnostics for the Problems panel.
 *
 * Every parser is intentionally conservative: it only emits a problem when it
 * can identify a real message, and it never invents a file or line number. When
 * nothing matches, `parseProblems` falls back to a single run-level problem so
 * a failure is never silently swallowed.
 */

import type { IdeParsedProblem, IdeRunKind } from '@/types/ide';
import { isValidProjectPath, normalizeProjectPath } from './paths';

/** Strip ANSI colour codes so patterns match agent output from any terminal. */
export function stripAnsi(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u001b\u009b][[\]()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PR-TZcf-ntqry=><]/g, '');
}

/** Normalize a compiler-reported path into a project-relative one, if possible. */
function toProjectPath(raw: string): string | null {
  let candidate = raw.trim().replace(/^\.\//, '');

  // Compilers often print absolute paths; keep only the portion after a
  // recognizable project root marker.
  const markers = ['/src/', '/app/', '/lib/', '/components/', '/tests/', '/test/'];
  for (const marker of markers) {
    const index = candidate.indexOf(marker);
    if (index > 0) {
      candidate = candidate.slice(index + 1);
      break;
    }
  }

  if (candidate.startsWith('/')) {
    // Still absolute and unrecognized — keep only the last few segments.
    const segments = candidate.split('/').filter(Boolean);
    candidate = segments.slice(-3).join('/');
  }

  if (!candidate || !isValidProjectPath(candidate)) return null;

  try {
    return normalizeProjectPath(candidate);
  } catch {
    return null;
  }
}

function toInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/* ------------------------------------------------------------------ */
/* TypeScript (tsc)                                                    */
/* ------------------------------------------------------------------ */

/** `app/page.tsx(42,10): error TS2339: Property 'user' does not exist...` */
const TSC_PATTERN =
  /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/;

export function parseTypeScript(output: string): IdeParsedProblem[] {
  const problems: IdeParsedProblem[] = [];

  for (const line of output.split('\n')) {
    const match = TSC_PATTERN.exec(line.trim());
    if (!match) continue;

    problems.push({
      source: 'typescript',
      severity: match[4] === 'warning' ? 'warning' : 'error',
      file_path: toProjectPath(match[1]),
      line: toInt(match[2]),
      column: toInt(match[3]),
      code: match[5],
      message: match[6].trim(),
    });
  }

  return problems;
}

/* ------------------------------------------------------------------ */
/* Next.js build                                                       */
/* ------------------------------------------------------------------ */

/**
 * Next prints a location line then the message on following lines:
 *   ./app/page.tsx:42:10
 *   Type error: Property 'user' does not exist on type 'Session'.
 */
const NEXT_LOCATION_PATTERN = /^\.?\/?([\w./@-]+\.(?:tsx?|jsx?|mjs|cjs)):(\d+):(\d+)$/;

export function parseNextBuild(output: string): IdeParsedProblem[] {
  const problems: IdeParsedProblem[] = [];
  const lines = output.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const match = NEXT_LOCATION_PATTERN.exec(lines[i].trim());
    if (!match) continue;

    // The message is the next non-empty line that looks like a diagnostic.
    let message = '';
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j += 1) {
      const candidate = lines[j].trim();
      if (!candidate) continue;
      if (/^(Type error|Error|Syntax Error|ReferenceError|TypeError):/i.test(candidate)) {
        message = candidate;
        break;
      }
      if (!message) message = candidate;
    }

    if (!message) continue;

    problems.push({
      source: 'build',
      severity: 'error',
      file_path: toProjectPath(match[1]),
      line: toInt(match[2]),
      column: toInt(match[3]),
      code: null,
      message: message.replace(/^(Type error|Error):\s*/i, '').trim(),
    });
  }

  return problems;
}

/* ------------------------------------------------------------------ */
/* ESLint (stylish formatter)                                          */
/* ------------------------------------------------------------------ */

/**
 *   /abs/path/file.tsx
 *     12:5  error  'x' is defined but never used  no-unused-vars
 */
const ESLINT_FILE_PATTERN = /^(\/|\.\/|[A-Za-z]:\\)?[\w./\\@-]+\.(?:tsx?|jsx?|mjs|cjs)$/;
const ESLINT_ISSUE_PATTERN = /^(\d+):(\d+)\s+(error|warning)\s+(.+?)(?:\s\s+([\w@/-]+))?$/;

export function parseEslint(output: string): IdeParsedProblem[] {
  const problems: IdeParsedProblem[] = [];
  let currentFile: string | null = null;

  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (ESLINT_FILE_PATTERN.test(line)) {
      currentFile = toProjectPath(line);
      continue;
    }

    const match = ESLINT_ISSUE_PATTERN.exec(line);
    if (!match || !currentFile) continue;

    problems.push({
      source: 'eslint',
      severity: match[3] === 'warning' ? 'warning' : 'error',
      file_path: currentFile,
      line: toInt(match[1]),
      column: toInt(match[2]),
      code: match[5] ?? null,
      message: match[4].trim(),
    });
  }

  return problems;
}

/* ------------------------------------------------------------------ */
/* Test runners                                                        */
/* ------------------------------------------------------------------ */

/** Vitest / Jest `FAIL path/to/file.test.ts` lines, plus pytest failures. */
export function parseTests(output: string): IdeParsedProblem[] {
  const problems: IdeParsedProblem[] = [];
  const lines = output.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();

    const failMatch = /^(?:✕|×|FAIL|✗)\s+(.+?)(?:\s+\(\d+\s*m?s\))?$/.exec(line);
    if (failMatch) {
      const target = failMatch[1].trim();
      const pathCandidate = target.split(/[\s>]/)[0];
      problems.push({
        source: 'test',
        severity: 'error',
        file_path: toProjectPath(pathCandidate),
        line: null,
        column: null,
        code: null,
        message: `Test failed: ${target}`,
      });
      continue;
    }

    // pytest: `analysis/stats.py:12: AssertionError`
    const pytestMatch = /^(.+\.py):(\d+):\s*(.+)$/.exec(line);
    if (pytestMatch) {
      problems.push({
        source: 'test',
        severity: 'error',
        file_path: toProjectPath(pytestMatch[1]),
        line: toInt(pytestMatch[2]),
        column: null,
        code: null,
        message: pytestMatch[3].trim(),
      });
    }
  }

  return problems;
}

/* ------------------------------------------------------------------ */
/* Java (javac / maven)                                                */
/* ------------------------------------------------------------------ */

/** `src/main/java/com/nexus/App.java:12: error: cannot find symbol` */
const JAVAC_PATTERN = /^(.+\.java):(\d+):\s*(error|warning):\s*(.+)$/;

export function parseJava(output: string): IdeParsedProblem[] {
  const problems: IdeParsedProblem[] = [];

  for (const rawLine of output.split('\n')) {
    const match = JAVAC_PATTERN.exec(rawLine.trim().replace(/^\[ERROR\]\s*/, ''));
    if (!match) continue;

    problems.push({
      source: 'build',
      severity: match[3] === 'warning' ? 'warning' : 'error',
      file_path: toProjectPath(match[1]),
      line: toInt(match[2]),
      column: null,
      code: null,
      message: match[4].trim(),
    });
  }

  return problems;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

function dedupe(problems: IdeParsedProblem[]): IdeParsedProblem[] {
  const seen = new Set<string>();
  const result: IdeParsedProblem[] = [];

  for (const problem of problems) {
    const key = `${problem.source}|${problem.file_path}|${problem.line}|${problem.column}|${problem.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(problem);
  }

  return result;
}

/**
 * Parse output from a finished run.
 * `kind` selects which parsers are most likely to match, but every parser runs
 * because build output frequently contains type errors and lint output alike.
 */
export function parseProblems(rawOutput: string, kind: IdeRunKind): IdeParsedProblem[] {
  const output = stripAnsi(rawOutput);

  const problems = dedupe([
    ...parseTypeScript(output),
    ...parseNextBuild(output),
    ...parseEslint(output),
    ...parseJava(output),
    ...(kind === 'test' ? parseTests(output) : []),
  ]);

  if (problems.length) return problems;

  // Nothing structured matched. Surface the failure anyway, using the last
  // meaningful line of output so the panel is never misleadingly empty.
  const meaningful = output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^[-=_*\s]+$/.test(line));

  if (!meaningful.length) return [];

  return [
    {
      source: 'unknown',
      severity: 'error',
      file_path: null,
      line: null,
      column: null,
      code: null,
      message: meaningful[meaningful.length - 1].slice(0, 500),
    },
  ];
}
