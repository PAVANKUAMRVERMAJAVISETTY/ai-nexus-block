import { NextResponse } from 'next/server';
import {
  ApiError,
  byteLength,
  describeDbError,
  isUuid,
  readJsonBody,
  requireUser,
  toErrorResponse,
  type AuthedContext,
} from '@/lib/ide/api';
import { ancestorDirectories, basename, dirname, isWithin } from '@/lib/ide/paths';
import { detectLanguage } from '@/lib/ide/languages';
import { markIndexStale } from '@/lib/ide/index-service';
import type { IdeAgentAction, IdeFileOperation } from '@/types/ide';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { actionId: string };
}

/** Create any missing ancestor directory rows for a path. */
async function ensureDirectories(
  ctx: AuthedContext,
  projectId: string,
  path: string
): Promise<void> {
  const ancestors = ancestorDirectories(path);
  if (!ancestors.length) return;

  await ctx.supabase.from('ide_project_files').upsert(
    ancestors.map((dir) => ({
      project_id: projectId,
      user_id: ctx.userId,
      file_path: dir,
      filename: basename(dir),
      parent_path: dirname(dir),
      content: '',
      language: 'plaintext',
      size: 0,
      is_directory: true,
      is_binary: false,
      origin: 'ai' as const,
    })),
    { onConflict: 'project_id,file_path', ignoreDuplicates: true }
  );
}

/**
 * Apply one file operation.
 * Each operation is applied independently and its outcome recorded, so a
 * partial failure is reported precisely rather than silently swallowed.
 */
async function applyOperation(
  ctx: AuthedContext,
  projectId: string,
  operation: IdeFileOperation
): Promise<string> {
  switch (operation.type) {
    case 'create':
    case 'update': {
      const content = operation.content ?? '';
      await ensureDirectories(ctx, projectId, operation.path);

      const { error } = await ctx.supabase.from('ide_project_files').upsert(
        {
          project_id: projectId,
          user_id: ctx.userId,
          file_path: operation.path,
          filename: basename(operation.path),
          parent_path: dirname(operation.path),
          content,
          language: detectLanguage(operation.path),
          size: byteLength(content),
          is_directory: false,
          is_binary: false,
          origin: 'ai' as const,
        },
        { onConflict: 'project_id,file_path' }
      );

      if (error) throw new Error(`${operation.path}: ${describeDbError(error)}`);
      return `${operation.type === 'create' ? 'Created' : 'Updated'} ${operation.path}`;
    }

    case 'delete': {
      const { data: rows } = await ctx.supabase
        .from('ide_project_files')
        .select('id, file_path, is_directory')
        .eq('project_id', projectId);

      const all = (rows ?? []) as { id: string; file_path: string; is_directory: boolean }[];
      const target = all.find((row) => row.file_path === operation.path);

      if (!target) return `Skipped delete of ${operation.path} (already absent)`;

      // Directory paths are matched in memory, not with SQL LIKE, because
      // `%` and `_` are legal characters in a project path.
      const ids = target.is_directory
        ? all.filter((row) => isWithin(operation.path, row.file_path)).map((row) => row.id)
        : [target.id];

      const { error } = await ctx.supabase
        .from('ide_project_files')
        .delete()
        .eq('user_id', ctx.userId)
        .in('id', ids);

      if (error) throw new Error(`${operation.path}: ${describeDbError(error)}`);
      return `Deleted ${operation.path}${ids.length > 1 ? ` (${ids.length} entries)` : ''}`;
    }

    case 'rename': {
      const newPath = operation.newPath;
      if (!newPath) throw new Error(`${operation.path}: rename is missing a destination`);

      await ensureDirectories(ctx, projectId, newPath);

      const { data: existing } = await ctx.supabase
        .from('ide_project_files')
        .select('id')
        .eq('project_id', projectId)
        .eq('file_path', operation.path)
        .maybeSingle();

      if (!existing) throw new Error(`${operation.path}: not found`);

      const { error } = await ctx.supabase
        .from('ide_project_files')
        .update({
          file_path: newPath,
          filename: basename(newPath),
          parent_path: dirname(newPath),
          language: detectLanguage(newPath),
        })
        .eq('id', existing.id)
        .eq('user_id', ctx.userId);

      if (error) throw new Error(`${operation.path}: ${describeDbError(error)}`);
      return `Renamed ${operation.path} → ${newPath}`;
    }

    default:
      throw new Error(`Unsupported operation type "${(operation as IdeFileOperation).type}"`);
  }
}

/**
 * PATCH /api/ide/actions/:id
 * Body: { decision: 'approve' | 'reject' }
 *
 * This is the only endpoint that writes AI-authored changes into a project.
 * A proposal must be `pending`, must belong to the caller, and — for high-risk
 * changes — must carry `confirmHighRisk: true` from a second confirmation step.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    if (!isUuid(params.actionId)) throw new ApiError(400, 'Invalid action id.');

    const body = await readJsonBody(request);
    const decision = body.decision;

    if (decision !== 'approve' && decision !== 'reject') {
      throw new ApiError(400, 'decision must be "approve" or "reject".');
    }

    const { data: existing, error: findError } = await ctx.supabase
      .from('ide_agent_actions')
      .select('*')
      .eq('id', params.actionId)
      .eq('requested_by', ctx.userId)
      .maybeSingle();

    if (findError) throw new ApiError(500, describeDbError(findError));
    if (!existing) throw new ApiError(404, 'Change proposal not found.');

    const action = existing as IdeAgentAction;

    if (action.status !== 'pending') {
      throw new ApiError(
        409,
        `This proposal has already been ${action.status}. It cannot be changed again.`
      );
    }

    if (decision === 'reject') {
      const { data, error } = await ctx.supabase
        .from('ide_agent_actions')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          result_log: 'Rejected by user. No files were modified.',
        })
        .eq('id', action.id)
        .eq('requested_by', ctx.userId)
        .select('*')
        .single();

      if (error) throw new ApiError(400, describeDbError(error));
      return NextResponse.json({ action: data, applied: false });
    }

    // Second gate for destructive changes.
    if (action.risk === 'high' && body.confirmHighRisk !== true) {
      throw new ApiError(
        428,
        'This is a high-risk change. Confirm it explicitly before it can be applied.'
      );
    }

    const operations = action.proposed_change?.operations ?? [];
    if (!operations.length) {
      throw new ApiError(400, 'This proposal contains no operations to apply.');
    }

    const applied: string[] = [];
    const failures: string[] = [];

    for (const operation of operations) {
      try {
        applied.push(await applyOperation(ctx, action.project_id, operation));
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      }
    }

    await markIndexStale(ctx, action.project_id);

    const status = failures.length === 0 ? 'applied' : 'failed';
    const resultLog = [
      ...applied.map((line) => `OK   ${line}`),
      ...failures.map((line) => `FAIL ${line}`),
    ].join('\n');

    const { data: updated, error: updateError } = await ctx.supabase
      .from('ide_agent_actions')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        applied_at: new Date().toISOString(),
        result_log: resultLog,
        error_message: failures.length ? failures.join('; ').slice(0, 2000) : null,
        after_state: Object.fromEntries(
          operations
            .filter((op) => op.type === 'create' || op.type === 'update')
            .map((op) => [op.path, op.content ?? ''])
        ),
      })
      .eq('id', action.id)
      .eq('requested_by', ctx.userId)
      .select('*')
      .single();

    if (updateError) throw new ApiError(400, describeDbError(updateError));

    return NextResponse.json({
      action: updated,
      applied: failures.length === 0,
      appliedOperations: applied,
      failedOperations: failures,
      // The client queues this separately so the user sees the run start.
      validationCommand: action.proposed_change?.validationCommand ?? null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** GET /api/ide/actions/:id — full proposal detail for the review dialog. */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    if (!isUuid(params.actionId)) throw new ApiError(400, 'Invalid action id.');

    const { data, error } = await ctx.supabase
      .from('ide_agent_actions')
      .select('*')
      .eq('id', params.actionId)
      .eq('requested_by', ctx.userId)
      .maybeSingle();

    if (error) throw new ApiError(500, describeDbError(error));
    if (!data) throw new ApiError(404, 'Change proposal not found.');

    return NextResponse.json({ action: data });
  } catch (error) {
    return toErrorResponse(error);
  }
}
