import { describe, expect, it } from 'vitest';
import { ProposalParseError, extractActionBlock, parseProposal } from '@/lib/ide/actions';

function proposal(payload: unknown, prose = 'Here is what I will change.') {
  return `${prose}\n\n\`\`\`nexus-action\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
}

describe('extractActionBlock', () => {
  it('returns null when there is no proposal', () => {
    expect(extractActionBlock('Just an explanation, no changes.')).toBeNull();
  });

  it('separates the block from the prose', () => {
    const result = extractActionBlock(proposal({ operations: [] }, 'Explanation.'));
    expect(result).not.toBeNull();
    expect(result!.stripped).toBe('Explanation.');
    expect(result!.json).toContain('operations');
  });
});

describe('parseProposal', () => {
  it('returns null for a read-only answer', () => {
    expect(parseProposal('This file renders the dashboard.')).toBeNull();
  });

  it('parses a valid single-file change', () => {
    const result = parseProposal(
      proposal({
        title: 'Fix the type error',
        summary: 'Widen the prop type.',
        risk: 'low',
        validationCommand: 'npm run typecheck',
        operations: [{ type: 'update', path: 'app/page.tsx', content: 'export default 1;' }],
      })
    );

    expect(result).not.toBeNull();
    expect(result!.title).toBe('Fix the type error');
    expect(result!.risk).toBe('low');
    expect(result!.change.validationCommand).toBe('npm run typecheck');
    expect(result!.change.operations).toHaveLength(1);
    expect(result!.change.operations[0].language).toBe('typescript');
    expect(result!.displayContent).toBe('Here is what I will change.');
  });

  // A model that emits "// ...rest of file unchanged" would silently destroy
  // everything below that line, because content is written verbatim.
  it('rejects ellipsis placeholders instead of full file content', () => {
    for (const placeholder of [
      '// ... rest of file unchanged',
      '# ...remaining code unchanged',
      '/* ... rest of the file */',
      '... rest of file unchanged',
    ]) {
      expect(
        () =>
          parseProposal(
            proposal({
              operations: [
                { type: 'update', path: 'app/page.tsx', content: `const a = 1;\n${placeholder}` },
              ],
            })
          ),
        placeholder
      ).toThrow(ProposalParseError);
    }
  });

  it('rejects paths that would escape the project', () => {
    for (const path of ['../../etc/passwd', '.git/config', 'node_modules/x.js', 'C:/Windows/x']) {
      expect(
        () => parseProposal(proposal({ operations: [{ type: 'create', path, content: 'x' }] })),
        path
      ).toThrow(ProposalParseError);
    }
  });

  it('confines an absolute-looking path to the project instead of escaping', () => {
    // A leading slash is stripped, so this becomes an ordinary project file.
    // It can never reach the real /etc/passwd: the agent resolves every path
    // beneath its workspace root and re-checks containment before writing.
    const result = parseProposal(
      proposal({ operations: [{ type: 'create', path: '/etc/passwd', content: 'x' }] })
    );

    expect(result!.change.operations[0].path).toBe('etc/passwd');
    expect(result!.change.operations[0].path.startsWith('/')).toBe(false);
  });

  it('rejects binary targets', () => {
    expect(() =>
      parseProposal(proposal({ operations: [{ type: 'create', path: 'logo.png', content: 'x' }] }))
    ).toThrow(ProposalParseError);
  });

  it('rejects malformed proposals', () => {
    expect(() => parseProposal('```nexus-action\nnot json\n```')).toThrow(ProposalParseError);
    expect(() => parseProposal(proposal({ operations: [] }))).toThrow(ProposalParseError);
    expect(() => parseProposal(proposal({ operations: 'nope' }))).toThrow(ProposalParseError);
    expect(() =>
      parseProposal(proposal({ operations: [{ type: 'explode', path: 'a.ts' }] }))
    ).toThrow(ProposalParseError);
    expect(() =>
      parseProposal(proposal({ operations: [{ type: 'update', path: 'a.ts' }] }))
    ).toThrow(ProposalParseError);
  });

  it('rejects the same path twice', () => {
    expect(() =>
      parseProposal(
        proposal({
          operations: [
            { type: 'update', path: 'a.ts', content: '1' },
            { type: 'delete', path: 'a.ts' },
          ],
        })
      )
    ).toThrow(ProposalParseError);
  });

  it('rejects proposals above the operation limit', () => {
    const operations = Array.from({ length: 30 }, (_, i) => ({
      type: 'create',
      path: `file-${i}.ts`,
      content: 'x',
    }));
    expect(() => parseProposal(proposal({ operations }))).toThrow(ProposalParseError);
  });

  it('escalates risk to high when a delete is present, even if the model said low', () => {
    const result = parseProposal(
      proposal({ risk: 'low', operations: [{ type: 'delete', path: 'lib/old.ts' }] })
    );
    expect(result!.risk).toBe('high');
  });

  it('infers high risk for configuration files', () => {
    const result = parseProposal(
      proposal({ operations: [{ type: 'update', path: 'package.json', content: '{}' }] })
    );
    expect(result!.risk).toBe('high');
  });

  it('drops a disallowed validation command but keeps the change', () => {
    const result = parseProposal(
      proposal({
        validationCommand: 'rm -rf /',
        operations: [{ type: 'create', path: 'a.ts', content: 'x' }],
      })
    );

    expect(result!.change.validationCommand).toBeNull();
    expect(result!.warnings.length).toBeGreaterThan(0);
    expect(result!.change.operations).toHaveLength(1);
  });

  it('validates rename destinations', () => {
    expect(() =>
      parseProposal(
        proposal({ operations: [{ type: 'rename', path: 'a.ts', newPath: '../../b.ts' }] })
      )
    ).toThrow(ProposalParseError);

    const ok = parseProposal(
      proposal({ operations: [{ type: 'rename', path: 'a.ts', newPath: 'lib/b.ts' }] })
    );
    expect(ok!.change.operations[0].newPath).toBe('lib/b.ts');
  });
});
