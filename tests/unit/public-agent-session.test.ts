import { describe, expect, it } from 'vitest';
import {
  createSessionState,
  continueSession,
  resumeAfterInput,
} from '@/lib/ai/agent-loop';
import { restorePublicAgentState } from '@/lib/ai/public-agent-session-store';

describe('public agent session persistence', () => {
  it('restores a valid serialized agent state', () => {
    const state = createSessionState('Tell me about AI Nexus Block');

    const restored = restorePublicAgentState(
      JSON.parse(JSON.stringify(state)),
    );

    expect(restored).not.toBeNull();
    expect(restored?.goal).toBe('Tell me about AI Nexus Block');
    expect(restored?.status).toBe(state.status);
    expect(restored?.transcript).toEqual(state.transcript);
  });

  it('rejects malformed persisted state', () => {
    expect(restorePublicAgentState(null)).toBeNull();
    expect(restorePublicAgentState({})).toBeNull();

    expect(
      restorePublicAgentState({
        goal: 'x',
        status: 'planning',
        transcript: [],
      }),
    ).toBeNull();
  });

  it('continues a completed session with the new user message', () => {
    const state = createSessionState('Tell me about AI Nexus Block');

    state.status = 'completed';
    state.success = true;

    const originalLength = state.transcript.length;

    const continued = continueSession(
      state,
      'Also tell me about DevRoadmap Engine',
    );

    expect(continued.status).toBe('planning');
    expect(continued.success).toBeNull();
    expect(continued.errorMessage).toBeNull();
    expect(continued.transcript.length).toBe(originalLength + 1);
    expect(continued.transcript.at(-1)).toMatchObject({
      type: 'user',
      content: 'Also tell me about DevRoadmap Engine',
    });
  });

  it('resumes an awaiting-input session with the answer', () => {
    const state = createSessionState('Help me choose a roadmap');

    state.status = 'awaiting_input';
    state.pendingQuestion = 'Which role are you targeting?';

    const resumed = resumeAfterInput(
      state,
      'AI Full Stack Developer',
    );

    expect(resumed.status).toBe('planning');
    expect(resumed.pendingQuestion).toBeNull();
    expect(resumed.transcript.at(-1)).toMatchObject({
      type: 'user',
      content: 'AI Full Stack Developer',
    });
  });
});
