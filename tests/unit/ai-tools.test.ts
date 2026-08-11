import { describe, expect, it } from 'vitest';
import {
  InvalidToolCallError,
  TOOLS,
  describeToolCall,
  getTool,
  isWriteTool,
  parseAssistantTurn,
  renderToolCatalogue,
  validateToolCall,
} from '@/lib/ai/tools';

const call = (tool: string, args: Record<string, unknown> = {}) => ({ tool, args });

describe('tool catalogue', () => {
  it('assigns every tool an approval level', () => {
    for (const tool of TOOLS) {
      expect(['automatic', 'safe_command', 'requires_approval', 'requires_confirmation']).toContain(
        tool.approval
      );
    }
  });

  // The whole safety model rests on these being gated.
  it('gates every mutating tool behind user consent', () => {
    for (const name of [
      'project_create_file',
      'project_edit_file',
      'project_delete_file',
      'project_move_file',
      'git_commit',
      'git_push',
    ] as const) {
      expect(isWriteTool(name), name).toBe(true);
    }
  });

  it('leaves read tools automatic', () => {
    for (const name of [
      'project_list_files',
      'project_search',
      'project_read_file',
      'project_overview',
    ] as const) {
      expect(getTool(name)!.approval, name).toBe('automatic');
      expect(isWriteTool(name), name).toBe(false);
    }
  });

  it('requires explicit confirmation for irreversible operations', () => {
    expect(getTool('project_delete_file')!.approval).toBe('requires_confirmation');
    expect(getTool('git_commit')!.approval).toBe('requires_confirmation');
    expect(getTool('git_push')!.approval).toBe('requires_confirmation');
  });

  it('documents every tool in the catalogue sent to the model', () => {
    const rendered = renderToolCatalogue();
    for (const tool of TOOLS) {
      expect(rendered, tool.name).toContain(tool.name);
    }
  });
});

describe('validateToolCall — structure', () => {
  it('accepts well-formed calls', () => {
    expect(validateToolCall(call('project_list_files')).tool).toBe('project_list_files');
    expect(validateToolCall(call('project_read_file', { path: 'app/page.tsx' })).args.path).toBe(
      'app/page.tsx'
    );
  });

  it('rejects unknown tools', () => {
    expect(() => validateToolCall(call('rm_rf_everything'))).toThrow(InvalidToolCallError);
    expect(() => validateToolCall(call('eval'))).toThrow(InvalidToolCallError);
  });

  it('rejects malformed envelopes', () => {
    expect(() => validateToolCall(null)).toThrow(InvalidToolCallError);
    expect(() => validateToolCall('project_list_files')).toThrow(InvalidToolCallError);
    expect(() => validateToolCall([])).toThrow(InvalidToolCallError);
    expect(() => validateToolCall({})).toThrow(InvalidToolCallError);
  });
});

describe('validateToolCall — path traversal', () => {
  // A model is untrusted input. These must never reach the filesystem layer.
  it('blocks traversal in every file tool', () => {
    const attacks = ['../../etc/passwd', '.git/config', 'node_modules/x.js', 'C:/Windows/x'];

    for (const path of attacks) {
      expect(() => validateToolCall(call('project_read_file', { path })), path).toThrow(
        InvalidToolCallError
      );
      expect(
        () => validateToolCall(call('project_create_file', { path, content: 'x' })),
        path
      ).toThrow(InvalidToolCallError);
      expect(() => validateToolCall(call('project_delete_file', { path })), path).toThrow(
        InvalidToolCallError
      );
    }
  });

  it('confines an absolute-looking path to the project instead of escaping', () => {
    // The leading slash is stripped, so this becomes an ordinary project file.
    // It can never reach the real /etc/passwd: the agent resolves every path
    // beneath its workspace root and re-checks containment before writing.
    const result = validateToolCall(call('project_read_file', { path: '/etc/passwd' }));
    expect(result.args.path).toBe('etc/passwd');
    expect(String(result.args.path).startsWith('/')).toBe(false);
  });

  it('blocks traversal in a move destination', () => {
    expect(() =>
      validateToolCall(call('project_move_file', { path: 'a.ts', newPath: '../../b.ts' }))
    ).toThrow(InvalidToolCallError);
  });

  it('blocks traversal in multi-file reads and git stage', () => {
    expect(() =>
      validateToolCall(call('project_read_multiple_files', { paths: ['a.ts', '../../etc/passwd'] }))
    ).toThrow(InvalidToolCallError);
    expect(() => validateToolCall(call('git_stage', { paths: ['../escape'] }))).toThrow(
      InvalidToolCallError
    );
  });
});

describe('validateToolCall — terminal_run', () => {
  it('accepts allow-listed programs with separate args', () => {
    const result = validateToolCall(call('terminal_run', { command: 'npm', args: ['run', 'test'] }));
    expect(result.args.command).toBe('npm');
    expect(result.args.args).toEqual(['run', 'test']);
  });

  // The model cannot widen its own permissions by requesting another binary.
  it('rejects programs outside the allowlist', () => {
    for (const command of ['rm', 'curl', 'wget', 'bash', 'sh', 'sudo', 'chmod']) {
      expect(
        () => validateToolCall(call('terminal_run', { command, args: [] })),
        command
      ).toThrow(InvalidToolCallError);
    }
  });

  it('rejects a path instead of a program name', () => {
    expect(() => validateToolCall(call('terminal_run', { command: '/bin/sh' }))).toThrow(
      InvalidToolCallError
    );
    expect(() => validateToolCall(call('terminal_run', { command: './evil' }))).toThrow(
      InvalidToolCallError
    );
  });

  // There is no shell, but an argument escaping the workspace still matters.
  it('rejects traversal inside arguments', () => {
    expect(() =>
      validateToolCall(call('terminal_run', { command: 'node', args: ['../../../etc/passwd'] }))
    ).toThrow(InvalidToolCallError);
  });

  it('rejects non-string and oversized arguments', () => {
    expect(() =>
      validateToolCall(call('terminal_run', { command: 'npm', args: [{ evil: true }] }))
    ).toThrow(InvalidToolCallError);
    expect(() =>
      validateToolCall(call('terminal_run', { command: 'npm', args: ['x'.repeat(201)] }))
    ).toThrow(InvalidToolCallError);
    expect(() =>
      validateToolCall(call('terminal_run', { command: 'npm', args: Array(25).fill('x') }))
    ).toThrow(InvalidToolCallError);
    expect(() => validateToolCall(call('terminal_run', { command: 'npm', args: 'run test' }))).toThrow(
      InvalidToolCallError
    );
  });

  // Metacharacters are harmless without a shell, and are kept verbatim as one
  // argv element — the same property that makes commit messages work.
  it('keeps metacharacters inside a single argument', () => {
    const result = validateToolCall(
      call('terminal_run', { command: 'node', args: ['-e', 'console.log(1 && 2)'] })
    );
    expect((result.args.args as string[])[1]).toBe('console.log(1 && 2)');
  });
});

describe('validateToolCall — file edits', () => {
  it('requires complete file content', () => {
    expect(() => validateToolCall(call('project_edit_file', { path: 'a.ts' }))).toThrow(
      InvalidToolCallError
    );
  });

  // Applying a placeholder would delete the rest of the user's file.
  it('rejects ellipsis placeholders', () => {
    for (const content of [
      'const a = 1;\n// ... rest of file unchanged',
      'x\n# ...remaining code unchanged',
      'y\n/* ... existing code */',
    ]) {
      expect(
        () => validateToolCall(call('project_edit_file', { path: 'a.ts', content })),
        content
      ).toThrow(InvalidToolCallError);
    }
  });

  it('rejects content beyond the size cap', () => {
    expect(() =>
      validateToolCall(call('project_create_file', { path: 'a.ts', content: 'x'.repeat(600_000) }))
    ).toThrow(InvalidToolCallError);
  });

  it('accepts ordinary file content unchanged', () => {
    const content = 'export const x = 1;\n// a normal comment\n';
    const result = validateToolCall(call('project_edit_file', { path: 'lib/x.ts', content }));
    expect(result.args.content).toBe(content);
  });
});

describe('validateToolCall — control tools', () => {
  it('requires a summary to finish', () => {
    expect(() => validateToolCall(call('finish', {}))).toThrow(InvalidToolCallError);
    const result = validateToolCall(call('finish', { summary: 'Did the thing', success: true }));
    expect(result.args.success).toBe(true);
  });

  it('treats a missing success flag as not-successful', () => {
    expect(validateToolCall(call('finish', { summary: 'x' })).args.success).toBe(false);
  });

  it('requires a question to ask the user', () => {
    expect(() => validateToolCall(call('ask_user', {}))).toThrow(InvalidToolCallError);
  });
});

describe('parseAssistantTurn', () => {
  it('returns prose when there is no tool block', () => {
    const turn = parseAssistantTurn('Here is what I found in your project.');
    expect(turn.toolCall).toBeNull();
    expect(turn.parseError).toBeNull();
    expect(turn.message).toBe('Here is what I found in your project.');
  });

  it('extracts a tool call and strips the block from the prose', () => {
    const turn = parseAssistantTurn(
      'Let me look at the routes.\n\n```nexus-tool\n{"tool":"project_list_files","args":{}}\n```'
    );
    expect(turn.toolCall?.tool).toBe('project_list_files');
    expect(turn.message).toBe('Let me look at the routes.');
  });

  // Reported, not thrown: the loop feeds this back so the model can correct.
  it('reports malformed JSON instead of throwing', () => {
    const turn = parseAssistantTurn('```nexus-tool\n{not json}\n```');
    expect(turn.toolCall).toBeNull();
    expect(turn.parseError).toMatch(/valid JSON/i);
  });

  it('reports an invalid tool call instead of throwing', () => {
    const turn = parseAssistantTurn('```nexus-tool\n{"tool":"rm","args":{}}\n```');
    expect(turn.toolCall).toBeNull();
    expect(turn.parseError).toMatch(/unknown tool/i);
  });

  it('reports a traversal attempt as a parse error', () => {
    const turn = parseAssistantTurn(
      '```nexus-tool\n{"tool":"project_read_file","args":{"path":"../../etc/passwd"}}\n```'
    );
    expect(turn.toolCall).toBeNull();
    expect(turn.parseError).toMatch(/safe project path/i);
  });
});

describe('describeToolCall', () => {
  it('produces a readable activity label', () => {
    expect(describeToolCall(validateToolCall(call('test_run')))).toBe('Running tests');
    expect(
      describeToolCall(validateToolCall(call('project_read_file', { path: 'app/page.tsx' })))
    ).toBe('Reading app/page.tsx');
    expect(
      describeToolCall(validateToolCall(call('terminal_run', { command: 'npm', args: ['run', 'build'] })))
    ).toBe('Running npm run build');
  });
});
