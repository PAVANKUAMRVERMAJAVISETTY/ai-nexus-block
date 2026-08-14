import { describe, expect, it, vi } from 'vitest';
import { advanceSession, createSessionState, type AgentPorts } from '@/lib/ai/agent-loop';

const turn = (tool: string, args: Record<string, unknown> = {}, prose = '') =>
  `${prose}\n\n\`\`\`nexus-tool\n${JSON.stringify({ tool, args })}\n\`\`\``;

describe('Phase 11 — Autonomous Workflow Lifecycle Integration', () => {
  it('navigates complete session lifecycle from planning to completion with verification', async () => {
    let callCount = 0;
    const session = createSessionState('Fix TypeScript errors and verify build');

    const ports: AgentPorts = {
      buildSystemPrompt: () => 'System prompt context',
      callModel: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return turn('project_list_files', {}, 'I will inspect project files.');
        }
        if (callCount === 2) {
          return turn('project_edit_file', { path: 'src/index.ts', content: 'export const x = 1;' }, 'I will propose a fix.');
        }
        if (callCount === 3) {
          return turn('typecheck_run', {}, 'I will run typecheck to verify.');
        }
        return turn('finish', { summary: 'Verified TypeScript clean', success: true }, 'Task complete.');
      }),
      executeTool: vi.fn().mockImplementation(async (call) => {
        if (call.tool === 'project_list_files') {
          return { ok: true, content: 'src/index.ts\npackage.json' };
        }
        if (call.tool === 'project_edit_file') {
          return { ok: true, content: 'Proposed edit', pendingActionId: 'action_101' };
        }
        if (call.tool === 'typecheck_run') {
          return { ok: true, content: 'Command queued', pendingRunId: 'run_202' };
        }
        if (call.tool === 'finish') {
          return { ok: true, content: 'Finished', finished: { summary: 'Verified TypeScript clean', success: true } };
        }
        return { ok: false, content: 'Unknown tool' };
      }),
      pollRun: vi.fn().mockImplementation(async (runId) => {
        if (runId === 'run_202') {
          return { ok: true, content: 'Typecheck passed with 0 errors', verificationRan: true, verificationPassed: true };
        }
        return null;
      }),
    };

    // Step 1: Start planning & first turn
    let updated = await advanceSession(session, ports);
    // After turn 1 (list_files) & turn 2 (edit_file), it parks on awaiting_approval
    expect(updated.status).toBe('awaiting_approval');
    expect(updated.pendingActionId).toBe('action_101');

    // Simulate user approving action
    updated.status = 'planning';
    updated.pendingActionId = null;
    updated.transcript.push({
      type: 'observation',
      tool: 'project_edit_file',
      ok: true,
      content: 'Action action_101 approved by user and changes applied.',
      at: new Date().toISOString(),
    });

    // Step 2: Third turn -> typecheck_run -> parks on awaiting_command
    updated = await advanceSession(updated, ports);
    expect(updated.status).toBe('awaiting_command');
    expect(updated.pendingRunId).toBe('run_202');

    // Step 3: Resume session when pollRun returns completed result
    updated = await advanceSession(updated, ports);
    expect(updated.pendingRunId).toBeNull();
    expect(updated.status).toBe('completed');
    expect(updated.success).toBe(true);
    expect(updated.summary).toBe('Verified TypeScript clean');
  });

  it('prevents unverified success claim when verification failed', async () => {
    const session = createSessionState('Fix bug');
    let callIndex = 0;

    const ports: AgentPorts = {
      buildSystemPrompt: () => 'System prompt',
      callModel: vi.fn().mockImplementation(async () => {
        callIndex++;
        if (callIndex === 1) {
          return turn('test_run', {}, 'Running tests.');
        }
        return turn('finish', { summary: 'Attempted fix', success: false }, 'Done!');
      }),
      executeTool: vi.fn().mockImplementation(async (call) => {
        if (call.tool === 'test_run') {
          return { ok: true, content: 'Command queued', pendingRunId: 'run_failed' };
        }
        if (call.tool === 'finish') {
          return { ok: true, content: 'Finished', finished: { summary: 'Attempted fix', success: false } };
        }
        return { ok: false, content: 'Unknown' };
      }),
      pollRun: vi.fn().mockImplementation(async (runId) => {
        if (runId === 'run_failed') {
          return { ok: false, content: 'Tests failed: 2 errors', verificationRan: true, verificationPassed: false };
        }
        return null;
      }),
    };

    let updated = await advanceSession(session, ports);
    expect(updated.status).toBe('awaiting_command');

    // Resume: pollRun returns test failure
    updated = await advanceSession(updated, ports);
    expect(updated.status).toBe('completed');
    expect(updated.success).toBe(false);
  });
});
