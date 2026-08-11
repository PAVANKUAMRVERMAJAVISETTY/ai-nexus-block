import { NextResponse } from 'next/server';
import { ApiError, isUuid, readJsonBody, toErrorResponse } from '@/lib/ide/api';
import { requireAgentDevice, type AgentContext } from '@/lib/ide/agent-auth';
import { runDefaults } from '@/config/ide';
import { parseProblems } from '@/lib/ide/problem-parsers';
import {
  interpretGitError,
  parseGitBranches,
  parseGitDiff,
  parseGitLog,
  parseGitStatus,
  redactCredentials,
} from '@/lib/ide/git-parsers';
import type { GitOperationResult } from '@/types/git';
import type { IdeRunKind } from '@/types/ide';

export const dynamic = 'force-dynamic';

/** Keep persisted output bounded; the tail is what matters for diagnosis. */
function clampOutput(value: unknown): string {
  if (typeof value !== 'string') return '';
  if (value.length <= runDefaults.maxOutputBytes) return value;
  const kept = value.slice(-runDefaults.maxOutputBytes);
  return `…[output truncated, showing last ${runDefaults.maxOutputBytes} characters]…\n${kept}`;
}

/** Load a run that belongs to both this device and its owner. */
async function requireOwnedRun(ctx: AgentContext, runId: string) {
  const { data, error } = await ctx.admin
    .from('ide_project_runs')
    .select('id, project_id, status, kind, started_at, cancel_requested, operation')
    .eq('id', runId)
    .eq('user_id', ctx.userId)
    .eq('device_id', ctx.deviceId)
    .maybeSingle();

  if (error) throw new ApiError(500, 'Could not load the run.');
  if (!data) throw new ApiError(404, 'Run not found for this device.');

  return data as {
    id: string;
    project_id: string;
    status: string;
    kind: IdeRunKind;
    started_at: string | null;
    cancel_requested: boolean;
    operation: { op?: string } | null;
  };
}

/**
 * POST /api/ide/agent/report
 *
 * The agent reports lifecycle events for a run it owns:
 *   { runId, event: 'started' }
 *   { runId, event: 'output', stream, chunk, seq }
 *   { runId, event: 'finished', status, exitCode, durationMs, stdout, stderr }
 *
 * On `finished`, stdout/stderr are parsed into normalized diagnostics and
 * written to `ide_problems` so the Problems panel is populated without the
 * browser having to re-parse raw terminal output.
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireAgentDevice(request);
    const body = await readJsonBody(request);

    const runId = body.runId;
    if (!isUuid(runId)) throw new ApiError(400, 'A valid runId is required.');

    const run = await requireOwnedRun(ctx, runId);
    const event = body.event;

    if (event === 'started') {
      await ctx.admin
        .from('ide_project_runs')
        .update({ status: 'running', started_at: new Date().toISOString() })
        .eq('id', run.id)
        .eq('user_id', ctx.userId);

      return NextResponse.json({ ok: true, cancelRequested: run.cancel_requested });
    }

    if (event === 'output') {
      const stream = body.stream === 'stderr' ? 'stderr' : body.stream === 'system' ? 'system' : 'stdout';
      const chunk = typeof body.chunk === 'string' ? body.chunk.slice(0, 16_000) : '';
      const seq = typeof body.seq === 'number' && Number.isFinite(body.seq) ? Math.floor(body.seq) : 0;

      if (chunk) {
        await ctx.admin.from('ide_run_logs').insert({
          run_id: run.id,
          user_id: ctx.userId,
          stream,
          seq,
          chunk,
        });
      }

      return NextResponse.json({ ok: true, cancelRequested: run.cancel_requested });
    }

    if (event === 'finished') {
      const allowed = ['success', 'error', 'cancelled', 'timeout'];
      const status = allowed.includes(body.status as string) ? (body.status as string) : 'error';

      const stdout = clampOutput(body.stdout);
      const stderr = clampOutput(body.stderr);
      const exitCode =
        typeof body.exitCode === 'number' && Number.isFinite(body.exitCode)
          ? Math.floor(body.exitCode)
          : null;
      const durationMs =
        typeof body.durationMs === 'number' && Number.isFinite(body.durationMs)
          ? Math.max(0, Math.floor(body.durationMs))
          : null;

      // Git output is parsed into structured results so the Source Control
      // panel does not have to re-parse porcelain in the browser.
      let gitResult: GitOperationResult | null = null;

      if (run.operation?.op) {
        gitResult = {};
        try {
          switch (run.operation.op) {
            case 'status':
              gitResult.status = parseGitStatus(stdout);
              break;
            case 'branch_list':
              gitResult.branches = parseGitBranches(stdout);
              break;
            case 'log':
              gitResult.commits = parseGitLog(stdout);
              break;
            case 'diff':
              gitResult.diff = parseGitDiff(stdout);
              break;
            default:
              break;
          }
        } catch {
          // A parse failure must never lose the raw output the user needs.
        }

        if (status !== 'success') {
          gitResult.errorExplanation = interpretGitError(stderr, exitCode);
        }
      }

      const { error: updateError } = await ctx.admin
        .from('ide_project_runs')
        .update({
          status,
          // Belt-and-braces: the agent already redacts, but nothing
          // credential-shaped may ever be persisted.
          stdout: redactCredentials(stdout),
          stderr: redactCredentials(stderr),
          exit_code: exitCode,
          duration_ms: durationMs,
          finished_at: new Date().toISOString(),
          ...(gitResult ? { result: gitResult } : {}),
        })
        .eq('id', run.id)
        .eq('user_id', ctx.userId);

      // A successful clone means the project now exists on local disk.
      if (status === 'success' && run.operation?.op === 'clone') {
        await ctx.admin
          .from('ide_projects')
          .update({ git_cloned_at: new Date().toISOString() })
          .eq('id', run.project_id)
          .eq('user_id', ctx.userId);
      }

      if (updateError) throw new ApiError(500, 'Could not record the run result.');

      // Replace this run's diagnostics rather than appending to them.
      await ctx.admin.from('ide_problems').delete().eq('run_id', run.id).eq('user_id', ctx.userId);

      let problemCount = 0;
      if (status !== 'success') {
        const parsed = parseProblems(`${stdout}\n${stderr}`, run.kind);
        if (parsed.length) {
          const rows = parsed.slice(0, 200).map((problem) => ({
            project_id: run.project_id,
            user_id: ctx.userId,
            run_id: run.id,
            source: problem.source,
            severity: problem.severity,
            file_path: problem.file_path,
            line: problem.line,
            column: problem.column,
            code: problem.code,
            message: problem.message,
          }));
          const { error: problemError } = await ctx.admin.from('ide_problems').insert(rows);
          if (!problemError) problemCount = rows.length;
        }
      }

      return NextResponse.json({ ok: true, problemCount });
    }

    throw new ApiError(400, `Unknown agent event "${String(event)}".`);
  } catch (error) {
    return toErrorResponse(error);
  }
}
