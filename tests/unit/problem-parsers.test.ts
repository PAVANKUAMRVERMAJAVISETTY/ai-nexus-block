import { describe, expect, it } from 'vitest';
import {
  parseEslint,
  parseJava,
  parseNextBuild,
  parseProblems,
  parseTypeScript,
  stripAnsi,
} from '@/lib/ide/problem-parsers';

describe('stripAnsi', () => {
  it('removes colour codes without touching text', () => {
    expect(stripAnsi('[31mFAIL[0m app/page.tsx')).toBe('FAIL app/page.tsx');
    expect(stripAnsi('plain text')).toBe('plain text');
  });
});

describe('parseTypeScript', () => {
  it('parses tsc diagnostics', () => {
    const output = [
      "app/page.tsx(42,10): error TS2339: Property 'user' does not exist on type 'Session'.",
      "lib/util.ts(7,3): warning TS6133: 'x' is declared but its value is never read.",
    ].join('\n');

    const problems = parseTypeScript(output);

    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatchObject({
      source: 'typescript',
      severity: 'error',
      file_path: 'app/page.tsx',
      line: 42,
      column: 10,
      code: 'TS2339',
    });
    expect(problems[0].message).toContain("Property 'user' does not exist");
    expect(problems[1].severity).toBe('warning');
  });

  it('ignores unrelated output', () => {
    expect(parseTypeScript('Compiling...\nDone in 3s')).toHaveLength(0);
  });
});

describe('parseNextBuild', () => {
  it('parses the location-then-message shape', () => {
    const output = [
      'Failed to compile.',
      '',
      './app/page.tsx:42:10',
      "Type error: Property 'user' does not exist on type 'Session'.",
    ].join('\n');

    const problems = parseNextBuild(output);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({
      source: 'build',
      severity: 'error',
      file_path: 'app/page.tsx',
      line: 42,
      column: 10,
    });
    expect(problems[0].message).toBe("Property 'user' does not exist on type 'Session'.");
  });
});

describe('parseEslint', () => {
  it('parses stylish output and attributes issues to the right file', () => {
    const output = [
      '/Users/dev/project/app/page.tsx',
      "  12:5   error    'x' is defined but never used   no-unused-vars",
      '  20:1   warning  Missing return type             @typescript-eslint/explicit-function-return-type',
      '',
      '/Users/dev/project/lib/util.ts',
      '  3:10  error  Unexpected console statement  no-console',
    ].join('\n');

    const problems = parseEslint(output);

    expect(problems).toHaveLength(3);
    expect(problems[0]).toMatchObject({
      source: 'eslint',
      severity: 'error',
      line: 12,
      column: 5,
      code: 'no-unused-vars',
    });
    expect(problems[0].file_path).toContain('app/page.tsx');
    expect(problems[1].severity).toBe('warning');
    expect(problems[2].file_path).toContain('lib/util.ts');
  });
});

describe('parseJava', () => {
  it('parses javac and maven diagnostics', () => {
    const output = [
      'src/main/java/com/nexus/App.java:12: error: cannot find symbol',
      '[ERROR] src/main/java/com/nexus/Greeter.java:8: error: incompatible types',
    ].join('\n');

    const problems = parseJava(output);

    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatchObject({ line: 12, severity: 'error', source: 'build' });
    expect(problems[0].file_path).toContain('App.java');
    expect(problems[1].file_path).toContain('Greeter.java');
  });
});

describe('parseProblems', () => {
  it('deduplicates identical findings from multiple parsers', () => {
    const line = "app/page.tsx(42,10): error TS2339: Property 'user' does not exist.";
    const problems = parseProblems(`${line}\n${line}`, 'typecheck');
    expect(problems).toHaveLength(1);
  });

  // A failure must never produce an empty Problems panel — that reads as "no
  // problems" when the command actually failed.
  it('falls back to a run-level problem when nothing structured matches', () => {
    const problems = parseProblems('Something went badly wrong\nnpm ERR! code ELIFECYCLE', 'build');

    expect(problems).toHaveLength(1);
    expect(problems[0].source).toBe('unknown');
    expect(problems[0].severity).toBe('error');
    expect(problems[0].message).toContain('ELIFECYCLE');
  });

  it('returns nothing for genuinely empty output', () => {
    expect(parseProblems('', 'build')).toHaveLength(0);
    expect(parseProblems('   \n\n---\n', 'build')).toHaveLength(0);
  });

  it('handles colourized output', () => {
    const problems = parseProblems(
      "[31mapp/page.tsx(1,1): error TS1005: ';' expected.[0m",
      'typecheck'
    );
    expect(problems[0]).toMatchObject({ source: 'typescript', line: 1, code: 'TS1005' });
  });
});
