import { describe, expect, it } from 'vitest';
import { isFreshHeartbeat } from '@/lib/ide/agent-auth';
import { AGENT_ONLINE_WINDOW_MS } from '@/lib/ide/agent-protocol';

// A fixed "now" so these never depend on wall-clock timing.
const NOW = new Date('2026-08-11T12:00:00.000Z').getTime();
const at = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe('isFreshHeartbeat', () => {
  it('treats a device that has never checked in as offline', () => {
    expect(isFreshHeartbeat(null, NOW)).toBe(false);
    expect(isFreshHeartbeat(undefined, NOW)).toBe(false);
    expect(isFreshHeartbeat('', NOW)).toBe(false);
  });

  it('treats an unparseable timestamp as offline rather than online', () => {
    // Failing closed matters: the consequence of a wrong "online" is the agent
    // claiming a command ran when nothing did.
    expect(isFreshHeartbeat('not a date', NOW)).toBe(false);
  });

  it('is online within the window and offline past it', () => {
    expect(isFreshHeartbeat(at(0), NOW)).toBe(true);
    expect(isFreshHeartbeat(at(AGENT_ONLINE_WINDOW_MS - 1), NOW)).toBe(true);
    expect(isFreshHeartbeat(at(AGENT_ONLINE_WINDOW_MS), NOW)).toBe(true);
    expect(isFreshHeartbeat(at(AGENT_ONLINE_WINDOW_MS + 1), NOW)).toBe(false);
  });

  it('treats a long-dead agent as offline', () => {
    expect(isFreshHeartbeat(at(60 * 60 * 1000), NOW)).toBe(false);
  });

  // Server and agent clocks are never exactly aligned; a heartbeat stamped a
  // little in the future has still just arrived.
  it('accepts a slightly future timestamp from clock skew', () => {
    expect(isFreshHeartbeat(new Date(NOW + 5_000).toISOString(), NOW)).toBe(true);
  });

  it('uses a window short enough to notice a dead agent quickly', () => {
    // The agent polls every few seconds, so this can be tight. If someone
    // widens it to minutes, the IDE would keep claiming "connected" long after
    // the process died.
    expect(AGENT_ONLINE_WINDOW_MS).toBeLessThanOrEqual(60_000);
  });
});
