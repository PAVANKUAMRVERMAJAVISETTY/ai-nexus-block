import { describe, expect, it } from 'vitest';
import { executeToolCall, type ExecutorContext } from '@/lib/ide/tool-executor';
import type { IdeProject } from '@/types/ide';

/**
 * The rule under test: when no local agent is connected, a tool that needs one
 * must fail immediately and say so — it must NOT insert a queued run.
 *
 * A queued run that nothing will ever claim is the failure mode that made the
 * product look like it was working: the session parks on `awaiting_command`
 * and only gives up at the ten-minute timeout.
 */

interface Recorded {
  table: string;
  op: string;
}

/**
 * Minimal stand-in for the Supabase query builder.
 *
 * Every chained method returns `this`, and awaiting the builder resolves to
 * whatever the table's fixture says. That is enough for these paths and keeps
 * the test honest about which tables were touched.
 */
function makeSupabase(options: { devices: unknown[]; recorded: Recorded[] }) {
  const build = (table: string) => {
    const rows: unknown[] = table === 'ide_agent_devices' ? options.devices : [];

    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      // An insert that returns nothing would crash the caller reading `.id`,
      // which would mask the behaviour under test.
      single: () =>
        Promise.resolve({ data: rows[0] ?? { id: `${table}-row-1` }, error: null }),
      insert: () => {
        options.recorded.push({ table, op: 'insert' });
        return builder;
      },
      update: () => {
        options.recorded.push({ table, op: 'update' });
        return builder;
      },
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        resolve({ data: rows, error: null }),
    };

    return builder;
  };

  return { from: (table: string) => build(table) };
}

function makeContext(devices: unknown[]): { exec: ExecutorContext; recorded: Recorded[] } {
  const recorded: Recorded[] = [];
  const supabase = makeSupabase({ devices, recorded });

  const exec = {
    ctx: { supabase, userId: 'user-1' },
    project: { id: 'project-1', name: 'demo', user_id: 'user-1' } as unknown as IdeProject,
    sessionId: 'session-1',
  } as unknown as ExecutorContext;

  return { exec, recorded };
}

const COMMAND_TOOLS = ['terminal_run', 'test_run', 'build_run', 'typecheck_run', 'lint_run'];

describe('command tools while the local agent is offline', () => {
  it('refuses every command tool instead of queueing it', async () => {
    for (const tool of COMMAND_TOOLS) {
      const { exec, recorded } = makeContext([]);

      const result = await executeToolCall(exec, {
        tool: tool as never,
        args: { command: 'npm test' },
      });

      expect(result.ok, tool).toBe(false);
      expect(result.content, tool).toMatch(/no Nexus Local Development Agent is connected/i);

      // The important half: nothing was written to the run queue.
      const queued = recorded.filter((r) => r.table === 'ide_project_runs');
      expect(queued, `${tool} must not queue a run`).toHaveLength(0);
    }
  });

  it('refuses structured git operations too', async () => {
    const { exec, recorded } = makeContext([]);

    const result = await executeToolCall(exec, {
      tool: 'git_status' as never,
      args: {},
    });

    expect(result.ok).toBe(false);
    expect(result.content).toMatch(/no Nexus Local Development Agent is connected/i);
    expect(recorded.filter((r) => r.table === 'ide_project_runs')).toHaveLength(0);
  });

  // The wording is the guardrail: the model reads this and must not translate
  // it into "tests passed" or "the build succeeded".
  it('never implies the command ran', async () => {
    const { exec } = makeContext([]);

    const result = await executeToolCall(exec, {
      tool: 'test_run' as never,
      args: {},
    });

    // Not a bare word-search: the message deliberately contains "passed"
    // inside the instruction *not* to say it. What must be absent is any
    // phrasing that asserts an outcome.
    expect(result.content).not.toMatch(/tests? (have )?passed/i);
    expect(result.content).not.toMatch(/build (succeeded|passed)/i);
    expect(result.content).not.toMatch(/\bqueued\b/i);

    expect(result.content).toMatch(/nothing was executed/i);
    expect(result.content).toMatch(/unverified/i);
    expect(result.content).toMatch(/do not describe the command as having run/i);
  });

  it('leaves read-only tools working while the agent is offline', async () => {
    const { exec } = makeContext([]);

    const result = await executeToolCall(exec, {
      tool: 'project_list_files' as never,
      args: {},
    });

    // No files in the fixture, but the call is answered rather than refused.
    expect(result.ok).toBe(true);
  });
});

describe('command tools while the local agent is online', () => {
  it('gets past the offline guard and reaches the queue', async () => {
    const { exec, recorded } = makeContext([{ last_seen_at: new Date().toISOString() }]);

    await executeToolCall(exec, {
      tool: 'terminal_run' as never,
      args: { command: 'npm test' },
    });

    // Proves the guard is conditional, not a blanket refusal that would make
    // the offline assertions above pass for the wrong reason.
    expect(recorded.some((r) => r.table === 'ide_project_runs' && r.op === 'insert')).toBe(true);
  });
});
