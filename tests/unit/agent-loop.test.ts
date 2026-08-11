import { describe, expect, it, vi } from 'vitest';
import {
  AGENT_LIMITS,
  advanceSession,
  createSessionState,
  resumeAfterApproval,
  resumeAfterInput,
  sessionHasPassingVerification,
  verificationSummary,
  type AgentPorts,
  type AgentSessionState,
  type ToolResult,
} from '@/lib/ai/agent-loop';
import type { ToolCall } from '@/lib/ai/tools';

/** Wrap a tool call the way a model would emit it. */
const turn = (tool: string, args: Record<string, unknown> = {}, prose = '') =>
  `${prose}\n\n\`\`\`nexus-tool\n${JSON.stringify({ tool, args })}\n\`\`\``;

/**
 * Build ports driven by a scripted sequence of model turns.
 * This is what lets the loop be tested end-to-end without a live provider.
 */
function scriptedPorts(
  script: string[],
  toolResults: Partial<Record<string, ToolResult | ToolResult[]>> = {}
) {
  let index = 0;
  const executed: ToolCall[] = [];
  const consumed: Record<string, number> = {};

  const ports: AgentPorts = {
    buildSystemPrompt: () => 'SYSTEM',
    callModel: async () => {
      const response = script[index] ?? turn('finish', { summary: 'script exhausted', success: false });
      index += 1;
      return response;
    },
    executeTool: async (call) => {
      executed.push(call);

      const configured = toolResults[call.tool];
      if (Array.isArray(configured)) {
        const n = consumed[call.tool] ?? 0;
        consumed[call.tool] = n + 1;
        if (configured[n]) return configured[n];
      } else if (configured) {
        return configured;
      }

      if (call.tool === 'finish') {
        return {
          ok: true,
          content: 'finished',
          finished: {
            summary: String(call.args.summary),
            success: call.args.success === true,
          },
        };
      }
      if (call.tool === 'ask_user') {
        return { ok: true, content: 'asked', question: String(call.args.question) };
      }
      return { ok: true, content: `ran ${call.tool}` };
    },
    pollRun: async () => ({ ok: true, content: 'command finished' }),
  };

  return { ports, executed, modelCalls: () => index };
}

describe('advanceSession — basic flow', () => {
  it('runs read tools then finishes', async () => {
    const { ports, executed } = scriptedPorts([
      turn('project_list_files', {}, 'Let me look around.'),
      turn('project_read_file', { path: 'app/page.tsx' }),
      turn('finish', { summary: 'Explained the page.', success: false }),
    ]);

    const state = await advanceSession(createSessionState('explain the page'), ports);

    expect(state.status).toBe('completed');
    expect(executed.map((c) => c.tool)).toEqual([
      'project_list_files',
      'project_read_file',
      'finish',
    ]);
    expect(state.summary).toBe('Explained the page.');
  });

  it('records prose, tool calls and observations in the transcript', async () => {
    const { ports } = scriptedPorts([
      turn('project_list_files', {}, 'Looking around.'),
      turn('finish', { summary: 'done', success: false }),
    ]);

    const state = await advanceSession(createSessionState('goal'), ports);
    const types = state.transcript.map((e) => e.type);

    expect(types).toContain('user');
    expect(types).toContain('assistant');
    expect(types).toContain('tool_call');
    expect(types).toContain('observation');
  });

  it('treats a plain prose answer as completion', async () => {
    const { ports, executed } = scriptedPorts(['Authentication lives in features/auth.']);
    const state = await advanceSession(createSessionState('where is auth?'), ports);

    expect(state.status).toBe('completed');
    expect(executed).toHaveLength(0);
    // No verification ran, so success is explicitly unknown rather than true.
    expect(state.success).toBeNull();
  });
});

describe('advanceSession — the no-fake-success guarantee', () => {
  // The single most important behaviour in this phase.
  it('refuses to report success when no verification ever ran', async () => {
    const { ports } = scriptedPorts([
      turn('project_edit_file', { path: 'a.ts', content: 'export const a = 1;' }),
      turn('finish', { summary: 'Fixed it. Tests pass.', success: true }),
    ], {
      // The edit resolves without needing approval in this scripted setup.
      project_edit_file: { ok: true, content: 'applied' },
    });

    const state = await advanceSession(createSessionState('fix it'), ports);

    expect(state.status).toBe('completed');
    // The model CLAIMED success; the loop downgrades it because nothing ran.
    expect(state.success).toBeNull();
  });

  it('honours a success claim once a verification actually passed', async () => {
    const { ports } = scriptedPorts(
      [turn('test_run'), turn('finish', { summary: 'Tests pass.', success: true })],
      { test_run: { ok: true, content: '10 passed', verificationRan: true, verificationPassed: true } }
    );

    const state = await advanceSession(createSessionState('run tests'), ports);

    expect(state.success).toBe(true);
    expect(sessionHasPassingVerification(state)).toBe(true);
  });

  it('does not honour a success claim when the verification failed', async () => {
    const { ports } = scriptedPorts(
      [turn('test_run'), turn('finish', { summary: 'All good!', success: true })],
      { test_run: { ok: false, content: '2 failed', verificationRan: true, verificationPassed: false } }
    );

    const state = await advanceSession(createSessionState('run tests'), ports);

    expect(state.success).toBeNull();
    expect(sessionHasPassingVerification(state)).toBe(false);
  });

  it('lets a later failure invalidate an earlier pass', async () => {
    const { ports } = scriptedPorts(
      [
        turn('test_run'),
        turn('project_edit_file', { path: 'a.ts', content: 'broken' }),
        turn('test_run'),
        turn('finish', { summary: 'done', success: true }),
      ],
      {
        test_run: [
          { ok: true, content: 'passed', verificationRan: true, verificationPassed: true },
          { ok: false, content: 'failed', verificationRan: true, verificationPassed: false },
        ],
        project_edit_file: { ok: true, content: 'applied' },
      }
    );

    const state = await advanceSession(createSessionState('x'), ports, { maxStepsThisCall: 10 });

    expect(sessionHasPassingVerification(state)).toBe(false);
    expect(state.success).toBeNull();
  });

  it('reports which verifications ran and their outcome', async () => {
    const { ports } = scriptedPorts(
      [turn('typecheck_run'), turn('test_run'), turn('finish', { summary: 'x', success: true })],
      {
        typecheck_run: { ok: true, content: 'clean', verificationRan: true, verificationPassed: true },
        test_run: { ok: false, content: '1 failed', verificationRan: true, verificationPassed: false },
      }
    );

    const state = await advanceSession(createSessionState('x'), ports, { maxStepsThisCall: 10 });
    const summary = verificationSummary(state);

    expect(summary).toContainEqual({ tool: 'typecheck_run', passed: true });
    expect(summary).toContainEqual({ tool: 'test_run', passed: false });
  });
});

describe('advanceSession — parking and resumption', () => {
  it('parks while a command runs, then resumes with its output', async () => {
    const { ports } = scriptedPorts([turn('test_run'), turn('finish', { summary: 'ok', success: false })], {
      test_run: { ok: true, content: 'queued', pendingRunId: 'run-1' },
    });

    let state = await advanceSession(createSessionState('run tests'), ports);
    expect(state.status).toBe('awaiting_command');
    expect(state.pendingRunId).toBe('run-1');

    // Still running: the loop stays parked and asks the model nothing.
    const stillRunning: AgentPorts = { ...ports, pollRun: async () => null };
    state = await advanceSession(state, stillRunning);
    expect(state.status).toBe('awaiting_command');

    // Finished: the observation is recorded and the loop continues.
    const finished: AgentPorts = {
      ...ports,
      pollRun: async () => ({
        ok: true,
        content: '10 passed',
        verificationRan: true,
        verificationPassed: true,
      }),
    };
    state = await advanceSession(state, finished);

    expect(state.status).toBe('completed');
    expect(
      state.transcript.some((e) => e.type === 'observation' && e.content.includes('10 passed'))
    ).toBe(true);
  });

  it('parks for approval and resumes when the user approves', async () => {
    const { ports } = scriptedPorts(
      [
        turn('project_edit_file', { path: 'a.ts', content: 'x' }),
        turn('finish', { summary: 'applied', success: false }),
      ],
      { project_edit_file: { ok: true, content: 'proposed', pendingActionId: 'action-1' } }
    );

    let state = await advanceSession(createSessionState('edit'), ports);
    expect(state.status).toBe('awaiting_approval');
    expect(state.pendingActionId).toBe('action-1');

    // While parked it must not call the model again.
    const before = state.iterations;
    state = await advanceSession(state, ports);
    expect(state.iterations).toBe(before);

    state = resumeAfterApproval(state, { approved: true, detail: 'Applied 1 file.' });
    expect(state.status).toBe('planning');

    state = await advanceSession(state, ports);
    expect(state.status).toBe('completed');
  });

  it('tells the model when a change was rejected', async () => {
    let state = createSessionState('edit');
    state.status = 'awaiting_approval';
    state.pendingActionId = 'action-1';

    state = resumeAfterApproval(state, { approved: false, detail: 'Not what I wanted.' });

    const observation = state.transcript.find((e) => e.type === 'observation');
    expect(observation).toBeDefined();
    expect((observation as { content: string }).content).toMatch(/REJECTED/);
    expect((observation as { ok: boolean }).ok).toBe(false);
  });

  it('parks for a question and resumes with the answer', async () => {
    const { ports } = scriptedPorts([
      turn('ask_user', { question: 'Which auth provider?' }),
      turn('finish', { summary: 'done', success: false }),
    ]);

    let state = await advanceSession(createSessionState('add auth'), ports);
    expect(state.status).toBe('awaiting_input');
    expect(state.pendingQuestion).toBe('Which auth provider?');

    state = resumeAfterInput(state, 'Use Supabase.');
    expect(state.status).toBe('planning');
    expect(state.transcript.some((e) => e.type === 'user' && e.content === 'Use Supabase.')).toBe(true);

    state = await advanceSession(state, ports);
    expect(state.status).toBe('completed');
  });
});

describe('advanceSession — the repair loop', () => {
  // The scenario the spec calls out: fail -> diagnose -> fix -> pass.
  it('diagnoses a failing test, fixes it, and re-runs to success', async () => {
    const { ports, executed } = scriptedPorts(
      [
        turn('test_run', {}, 'Running the tests first.'),
        turn('project_read_file', { path: 'lib/sum.ts' }, 'One failure — let me look.'),
        turn('project_edit_file', { path: 'lib/sum.ts', content: 'export const sum = (a,b) => a+b;' }),
        turn('test_run', {}, 'Re-running.'),
        turn('finish', { summary: 'Fixed sum(); tests pass.', success: true }),
      ],
      {
        test_run: [
          { ok: false, content: 'FAIL sum.test.ts: expected 3 got 2', verificationRan: true, verificationPassed: false },
          { ok: true, content: '3 passed', verificationRan: true, verificationPassed: true },
        ],
        project_edit_file: { ok: true, content: 'applied' },
      }
    );

    const state = await advanceSession(createSessionState('fix the failing tests'), ports, {
      maxStepsThisCall: 10,
    });

    expect(state.status).toBe('completed');
    expect(executed.map((c) => c.tool)).toEqual([
      'test_run',
      'project_read_file',
      'project_edit_file',
      'test_run',
      'finish',
    ]);
    // Success is honoured because the final verification genuinely passed.
    expect(state.success).toBe(true);
    expect(state.repairAttempts).toBeGreaterThan(0);
  });

  it('gives up after too many failed repair attempts', async () => {
    const failing: ToolResult = {
      ok: false,
      content: 'still failing',
      verificationRan: true,
      verificationPassed: false,
    };
    const script = Array.from({ length: 30 }, () => turn('test_run'));

    const { ports } = scriptedPorts(script, { test_run: failing });
    const state = await advanceSession(createSessionState('fix tests'), ports, {
      maxStepsThisCall: 50,
    });

    expect(state.status).toBe('failed');
    expect(state.errorMessage).toMatch(/attempts to fix/i);
    expect(state.repairAttempts).toBeLessThanOrEqual(AGENT_LIMITS.maxRepairAttempts);
  });
});

describe('advanceSession — loop safety', () => {
  it('stops at the iteration ceiling instead of looping forever', async () => {
    // A model that never finishes.
    const script = Array.from({ length: 200 }, () => turn('project_list_files'));
    const { ports } = scriptedPorts(script);

    const state = await advanceSession(createSessionState('loop'), ports, {
      maxStepsThisCall: 1000,
    });

    expect(state.status).toBe('failed');
    expect(state.iterations).toBeLessThanOrEqual(AGENT_LIMITS.maxIterations);
    expect(state.errorMessage).toMatch(/without finishing/i);
  });

  it('bounds work per request so a single call cannot run away', async () => {
    const script = Array.from({ length: 200 }, () => turn('project_list_files'));
    const { ports, modelCalls } = scriptedPorts(script);

    const state = await advanceSession(createSessionState('loop'), ports, { maxStepsThisCall: 3 });

    expect(modelCalls()).toBe(3);
    expect(state.status).toBe('planning'); // parked for the caller to resume
  });

  it('honours cancellation before doing any work', async () => {
    const { ports, modelCalls } = scriptedPorts([turn('project_list_files')]);
    const state = createSessionState('x');
    state.cancelRequested = true;

    const result = await advanceSession(state, ports);

    expect(result.status).toBe('cancelled');
    expect(modelCalls()).toBe(0);
    expect(result.success).toBeNull();
  });

  it('stops mid-run when cancellation arrives between steps', async () => {
    const script = Array.from({ length: 10 }, () => turn('project_list_files'));
    const state = createSessionState('x');

    const base = scriptedPorts(script);
    const ports: AgentPorts = {
      ...base.ports,
      executeTool: async (call) => {
        // The user presses Stop while the first tool is executing.
        state.cancelRequested = true;
        return base.ports.executeTool(call);
      },
    };

    const result = await advanceSession(state, ports, { maxStepsThisCall: 10 });

    expect(result.status).toBe('cancelled');
    expect(result.toolCalls).toBe(1);
  });

  it('recovers from a malformed tool call by telling the model', async () => {
    const { ports } = scriptedPorts([
      '```nexus-tool\n{broken json}\n```',
      turn('finish', { summary: 'recovered', success: false }),
    ]);

    const state = await advanceSession(createSessionState('x'), ports, { maxStepsThisCall: 5 });

    expect(state.status).toBe('completed');
    expect(
      state.transcript.some((e) => e.type === 'note' && e.content.includes('Invalid tool call'))
    ).toBe(true);
  });

  it('aborts after repeated malformed tool calls', async () => {
    const { ports } = scriptedPorts(Array.from({ length: 10 }, () => '```nexus-tool\n{bad}\n```'));

    const state = await advanceSession(createSessionState('x'), ports, { maxStepsThisCall: 10 });

    expect(state.status).toBe('failed');
    expect(state.errorMessage).toMatch(/invalid tool call/i);
  });

  it('stops at the tool-call ceiling', async () => {
    const state = createSessionState('x');
    state.toolCalls = AGENT_LIMITS.maxToolCalls;

    const { ports, modelCalls } = scriptedPorts([turn('project_list_files')]);
    const result = await advanceSession(state, ports);

    expect(result.status).toBe('failed');
    expect(modelCalls()).toBe(0);
  });
});

describe('transcript rendering', () => {
  it('feeds real tool output back to the model', async () => {
    const seen: string[] = [];
    const base = scriptedPorts(
      [turn('test_run'), turn('finish', { summary: 'x', success: false })],
      { test_run: { ok: false, content: 'FAIL: expected 3 received 2', verificationRan: true, verificationPassed: false } }
    );

    const ports: AgentPorts = {
      ...base.ports,
      callModel: async ({ messages }) => {
        seen.push(messages);
        return base.ports.callModel({ system: '', messages });
      },
    };

    await advanceSession(createSessionState('fix'), ports, { maxStepsThisCall: 5 });

    // The second model call must contain the real failure text.
    expect(seen[1]).toContain('FAIL: expected 3 received 2');
  });

  it('truncates a huge observation rather than blowing the context window', async () => {
    const huge = 'x'.repeat(50_000);
    const seen: string[] = [];
    const base = scriptedPorts(
      [turn('test_run'), turn('finish', { summary: 'x', success: false })],
      { test_run: { ok: false, content: huge } }
    );

    const ports: AgentPorts = {
      ...base.ports,
      callModel: async ({ messages }) => {
        seen.push(messages);
        return base.ports.callModel({ system: '', messages });
      },
    };

    await advanceSession(createSessionState('x'), ports, { maxStepsThisCall: 5 });

    expect(seen[1].length).toBeLessThan(20_000);
    expect(seen[1]).toContain('truncated');
  });
});
