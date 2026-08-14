import { describe, expect, it, vi } from 'vitest';
import { advanceSession, createSessionState, type AgentPorts } from '@/lib/ai/agent-loop';

const turn = (tool: string, args: Record<string, unknown> = {}, prose = '') =>
  `${prose}\n\n\`\`\`nexus-tool\n${JSON.stringify({ tool, args })}\n\`\`\``;

describe('Phase 11 — Command Lifecycle & Offline Gate Integration', () => {
  it('prevents command execution when local development agent is offline', async () => {
    const session = createSessionState('Run build command');

    const ports: AgentPorts = {
      buildSystemPrompt: () => 'System prompt',
      callModel: vi.fn().mockResolvedValue(turn('build_run', {}, 'Running build.')),
      executeTool: vi.fn().mockResolvedValue({
        ok: false,
        content: 'Could not run `build_run`: no Nexus Local Development Agent is connected, so nothing was executed.',
      }),
      pollRun: vi.fn().mockResolvedValue(null),
    };

    const updated = await advanceSession(session, ports);
    // Should NOT park on awaiting_command since tool execution returned ok: false immediately
    expect(updated.status).not.toBe('awaiting_command');
    expect(updated.transcript.some((t) => t.type === 'observation' && !t.ok && t.content.includes('connected'))).toBe(true);
  });

  it('correctly handles command timeout in run poller', async () => {
    const session = createSessionState('Run long build');
    session.status = 'awaiting_command';
    session.pendingRunId = 'run_timeout_99';

    const ports: AgentPorts = {
      buildSystemPrompt: () => 'System prompt',
      callModel: vi.fn().mockResolvedValue(turn('finish', { summary: 'Build timed out', success: false }, 'Handling timeout.')),
      executeTool: vi.fn().mockResolvedValue({
        ok: true,
        content: 'Finished',
        finished: { summary: 'Build timed out', success: false },
      }),
      pollRun: vi.fn().mockResolvedValue({
        ok: false,
        content: 'Command execution timed out after 600000ms.',
        verificationRan: true,
        verificationPassed: false,
      }),
    };

    const updated = await advanceSession(session, ports);
    expect(updated.pendingRunId).toBeNull();
    expect(updated.transcript.some((t) => t.type === 'observation' && !t.ok && t.content.includes('timed out'))).toBe(true);
  });
});
