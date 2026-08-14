import { describe, expect, it, vi } from 'vitest';
import { advanceSession, createSessionState, type AgentPorts } from '@/lib/ai/agent-loop';

const turn = (tool: string, args: Record<string, unknown> = {}, prose = '') =>
  `${prose}\n\n\`\`\`nexus-tool\n${JSON.stringify({ tool, args })}\n\`\`\``;

describe('Phase 11 — Approval & Resume Integration', () => {
  it('correctly enters awaiting_approval when file modification is proposed and resumes upon user decision', async () => {
    const session = createSessionState('Create new component button.tsx');

    const ports: AgentPorts = {
      buildSystemPrompt: () => 'System prompt',
      callModel: vi.fn().mockImplementation(async () => {
        return turn('project_create_file', { path: 'src/button.tsx', content: 'export const Button = () => null;' }, 'I will create button.tsx.');
      }),
      executeTool: vi.fn().mockImplementation(async () => {
        return {
          ok: true,
          content: 'The change has been proposed and is waiting for the user to review the diff.',
          pendingActionId: 'action_create_btn',
        };
      }),
      pollRun: vi.fn().mockResolvedValue(null),
    };

    // Step 1: Execute session turn
    let updated = await advanceSession(session, ports);
    expect(updated.status).toBe('awaiting_approval');
    expect(updated.pendingActionId).toBe('action_create_btn');

    // Step 2: Simulate User Rejection
    const rejectedSession = { ...updated };
    rejectedSession.status = 'planning';
    rejectedSession.pendingActionId = null;
    rejectedSession.transcript.push({
      type: 'observation',
      tool: 'project_create_file',
      ok: false,
      content: 'Action action_create_btn was rejected by the user. Proposed changes were discarded.',
      at: new Date().toISOString(),
    });

    const resumePorts: AgentPorts = {
      ...ports,
      callModel: vi.fn().mockResolvedValue(turn('finish', { summary: 'Proposal rejected', success: false }, 'Understood. I will cancel the proposal.')),
      executeTool: vi.fn().mockResolvedValue({
        ok: true,
        content: 'Finished',
        finished: { summary: 'Proposal rejected', success: false },
      }),
    };

    const finalSession = await advanceSession(rejectedSession, resumePorts);
    expect(finalSession.status).toBe('completed');
    expect(finalSession.success).toBe(false);
  });
});
