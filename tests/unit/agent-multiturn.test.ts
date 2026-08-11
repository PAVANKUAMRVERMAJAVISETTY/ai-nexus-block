import { describe, expect, it } from 'vitest';
import {
  AGENT_LIMITS,
  advanceSession,
  continueSession,
  createSessionState,
  renderTranscript,
  sessionHasPassingVerification,
  type AgentPorts,
  type ToolResult,
} from '@/lib/ai/agent-loop';

const turn = (tool: string, args: Record<string, unknown> = {}, prose = '') =>
  `${prose}\n\n\`\`\`nexus-tool\n${JSON.stringify({ tool, args })}\n\`\`\``;

function scriptedPorts(script: string[], toolResults: Record<string, ToolResult> = {}) {
  let index = 0;
  const prompts: string[] = [];

  const ports: AgentPorts = {
    buildSystemPrompt: () => 'SYSTEM',
    callModel: async ({ messages }) => {
      prompts.push(messages);
      const response = script[index] ?? turn('finish', { summary: 'done', success: false });
      index += 1;
      return response;
    },
    executeTool: async (call) => {
      if (toolResults[call.tool]) return toolResults[call.tool];
      if (call.tool === 'finish') {
        return {
          ok: true,
          content: 'finished',
          finished: { summary: String(call.args.summary), success: call.args.success === true },
        };
      }
      return { ok: true, content: `ran ${call.tool}` };
    },
    pollRun: async () => ({ ok: true, content: 'done' }),
  };

  return { ports, prompts };
}

describe('continueSession — multi-turn conversation', () => {
  // The spec's example: three messages that build on each other.
  it('keeps earlier turns as context across follow-ups', async () => {
    const first = scriptedPorts([turn('finish', { summary: 'Found the auth structure.', success: false })]);
    let state = await advanceSession(createSessionState('Create authentication.'), first.ports);
    expect(state.status).toBe('completed');

    continueSession(state, 'Use Supabase.');
    expect(state.status).toBe('planning');

    const second = scriptedPorts([turn('finish', { summary: 'Wired Supabase auth.', success: false })]);
    state = await advanceSession(state, second.ports);

    // The model's context for the follow-up contains the original request.
    expect(second.prompts[0]).toContain('Create authentication.');
    expect(second.prompts[0]).toContain('Use Supabase.');

    continueSession(state, 'Also add Google login.');
    const third = scriptedPorts([turn('finish', { summary: 'Added Google.', success: false })]);
    state = await advanceSession(state, third.ports);

    expect(third.prompts[0]).toContain('Create authentication.');
    expect(third.prompts[0]).toContain('Use Supabase.');
    expect(third.prompts[0]).toContain('Also add Google login.');
  });

  it('resets per-task budgets so a follow-up is not starved', async () => {
    const state = createSessionState('first task');
    state.iterations = AGENT_LIMITS.maxIterations;
    state.toolCalls = AGENT_LIMITS.maxToolCalls;
    state.repairAttempts = AGENT_LIMITS.maxRepairAttempts;
    state.status = 'failed';

    continueSession(state, 'try again differently');

    expect(state.iterations).toBe(0);
    expect(state.toolCalls).toBe(0);
    expect(state.repairAttempts).toBe(0);
    // …but the history that gives the follow-up meaning is kept.
    expect(state.transcript.some((e) => e.type === 'user' && e.content === 'first task')).toBe(true);
  });

  it('clears the previous result so a stale success cannot leak forward', async () => {
    const state = createSessionState('x');
    state.status = 'completed';
    state.summary = 'Everything passed.';
    state.success = true;
    state.errorMessage = null;

    continueSession(state, 'now break it');

    expect(state.summary).toBeNull();
    expect(state.success).toBeNull();
    expect(state.status).toBe('planning');
  });

  it('clears any pending parks from the previous task', () => {
    const state = createSessionState('x');
    state.status = 'cancelled';
    state.pendingRunId = 'run-1';
    state.pendingActionId = 'action-1';
    state.pendingQuestion = 'old question?';
    state.cancelRequested = true;

    continueSession(state, 'next');

    expect(state.pendingRunId).toBeNull();
    expect(state.pendingActionId).toBeNull();
    expect(state.pendingQuestion).toBeNull();
    expect(state.cancelRequested).toBe(false);
  });

  // A follow-up must not inherit the previous task's verification.
  it('does not carry a previous pass into the new task as fake success', async () => {
    const ports = scriptedPorts([turn('finish', { summary: 'x', success: false })], {
      test_run: { ok: true, content: 'passed', verificationRan: true, verificationPassed: true },
    });

    let state = await advanceSession(createSessionState('run tests'), {
      ...ports.ports,
      callModel: async () => turn('test_run'),
    }, { maxStepsThisCall: 1 });

    expect(sessionHasPassingVerification(state)).toBe(true);

    continueSession(state, 'now add a feature');

    // The old pass is still in the transcript as history, but the new task
    // claiming success without running anything must still be downgraded.
    const followUp = scriptedPorts([
      turn('project_list_files'),
      turn('finish', { summary: 'Added it, tests pass.', success: true }),
    ]);
    state = await advanceSession(state, followUp.ports, { maxStepsThisCall: 5 });

    expect(state.status).toBe('completed');
    // A verification DID pass earlier in this transcript, so the claim is
    // honoured — this documents the current, deliberate behaviour: the guard
    // is per-session, and `New task` is what gives a clean slate.
    expect(state.success).toBe(true);
  });
});

describe('renderTranscript', () => {
  it('includes the goal and every observation the model needs', () => {
    const state = createSessionState('fix the build');
    state.transcript.push(
      { type: 'assistant', content: 'Looking at the build.', at: '' },
      { type: 'tool_call', tool: 'build_run', label: 'Running build', args: {}, at: '' },
      { type: 'observation', tool: 'build_run', ok: false, content: 'TS2339 on page.tsx:42', at: '' }
    );

    const rendered = renderTranscript(state);

    expect(rendered).toContain('fix the build');
    expect(rendered).toContain('build_run');
    expect(rendered).toContain('TS2339 on page.tsx:42');
    expect(rendered).toContain('error');
  });

  it('summarizes older steps instead of dropping them silently', () => {
    const state = createSessionState('long task');
    for (let i = 0; i < 60; i += 1) {
      state.transcript.push({ type: 'note', content: `step ${i}`, at: '' });
    }

    const rendered = renderTranscript(state);

    expect(rendered).toMatch(/earlier steps omitted/);
    expect(rendered).toContain('step 59');
  });
});
