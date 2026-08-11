import { NextResponse } from 'next/server';
import {
  ApiError,
  describeDbError,
  isUuid,
  readJsonBody,
  requireUser,
  toErrorResponse,
} from '@/lib/ide/api';
import type { IdeRun, IdeRunLog } from '@/types/ide';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { runId: string };
}

/**
 * GET /api/ide/runs/:id?sinceSeq=<n>
 * Run detail plus incremental log chunks. The terminal polls this while a run
 * is active, passing the highest seq it already rendered.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();

    if (!isUuid(params.runId)) throw new ApiError(400, 'Invalid run id.');

    const { data: run, error } = await ctx.supabase
      .from('ide_project_runs')
      .select('*')
      .eq('id', params.runId)
      .eq('user_id', ctx.userId)
      .maybeSingle();

    if (error) throw new ApiError(500, describeDbError(error));
    if (!run) throw new ApiError(404, 'Run not found.');

    const sinceSeqParam = Number.parseInt(
      new URL(request.url).searchParams.get('sinceSeq') ?? '-1',
      10
    );
    const sinceSeq = Number.isFinite(sinceSeqParam) ? sinceSeqParam : -1;

    const { data: logs } = await ctx.supabase
      .from('ide_run_logs')
      .select('*')
      .eq('run_id', params.runId)
      .gt('seq', sinceSeq)
      .order('seq', { ascending: true })
      .limit(500);

    const { data: problems } = await ctx.supabase
      .from('ide_problems')
      .select('*')
      .eq('run_id', params.runId)
      .order('severity', { ascending: true })
      .limit(200);

    return NextResponse.json({
      run: run as IdeRun,
      logs: (logs ?? []) as IdeRunLog[],
      problems: problems ?? [],
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * PATCH /api/ide/runs/:id — request cancellation.
 * The server cannot kill the process; it raises a flag the agent reads on its
 * next poll and acts on locally.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    if (!isUuid(params.runId)) throw new ApiError(400, 'Invalid run id.');

    const body = await readJsonBody(request);
    if (body.cancel !== true) throw new ApiError(400, 'Only { cancel: true } is supported.');

    const { data: run, error: findError } = await ctx.supabase
      .from('ide_project_runs')
      .select('id, status')
      .eq('id', params.runId)
      .eq('user_id', ctx.userId)
      .maybeSingle();

    if (findError) throw new ApiError(500, describeDbError(findError));
    if (!run) throw new ApiError(404, 'Run not found.');

    // A run that never reached an agent can be cancelled outright.
    if (run.status === 'queued') {
      const { data, error } = await ctx.supabase
        .from('ide_project_runs')
        .update({
          status: 'cancelled',
          cancel_requested: true,
          finished_at: new Date().toISOString(),
        })
        .eq('id', run.id)
        .eq('user_id', ctx.userId)
        .select('*')
        .single();

      if (error) throw new ApiError(400, describeDbError(error));
      return NextResponse.json({ run: data, cancelledImmediately: true });
    }

    if (run.status !== 'claimed' && run.status !== 'running') {
      throw new ApiError(409, `A ${run.status} run cannot be cancelled.`);
    }

    const { data, error } = await ctx.supabase
      .from('ide_project_runs')
      .update({ cancel_requested: true })
      .eq('id', run.id)
      .eq('user_id', ctx.userId)
      .select('*')
      .single();

    if (error) throw new ApiError(400, describeDbError(error));

    return NextResponse.json({
      run: data,
      cancelledImmediately: false,
      message: 'Cancellation requested. The local agent will stop the process on its next poll.',
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
