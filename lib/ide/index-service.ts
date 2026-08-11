/**
 * Server-side project index service.
 *
 * Lives in `lib/` rather than in the route file because Next validates the
 * exports of `route.ts` modules — only HTTP methods and a fixed set of config
 * exports are permitted there.
 */

import { indexDefaults } from '@/config/ide';
import { ApiError, describeDbError, type AuthedContext } from './api';
import { buildProjectIndex, type ProjectIndexBundle } from './indexer';
import type { IdeFile, IdeProject } from '@/types/ide';

/**
 * Load the file rows used for indexing and AI context.
 *
 * Deliberately bounded: only rows at or below the indexable size cap are read
 * with their content, and at most 1000 of them, so indexing a large project
 * stays predictable in both time and memory.
 */
export async function loadIndexableFiles(
  ctx: AuthedContext,
  projectId: string
): Promise<IdeFile[]> {
  const { data, error } = await ctx.supabase
    .from('ide_project_files')
    .select('*')
    .eq('project_id', projectId)
    .lte('size', indexDefaults.maxIndexableFileBytes)
    .order('file_path', { ascending: true })
    .limit(1000);

  if (error) throw new ApiError(500, describeDbError(error));
  return (data ?? []) as IdeFile[];
}

/** Rebuild the index and persist each slice under its own `kind`. */
export async function rebuildIndex(
  ctx: AuthedContext,
  project: IdeProject
): Promise<ProjectIndexBundle> {
  const files = await loadIndexableFiles(ctx, project.id);
  const bundle = buildProjectIndex(project, files);

  const rows = [
    { kind: 'overview', payload: bundle.overview as unknown as Record<string, unknown> },
    { kind: 'modules', payload: { modules: bundle.modules } },
    { kind: 'routes', payload: { routes: bundle.routes } },
    { kind: 'tree', payload: { tree: bundle.tree } },
  ].map((row) => ({
    project_id: project.id,
    user_id: ctx.userId,
    kind: row.kind,
    payload: row.payload,
    file_count: files.length,
    is_stale: false,
    generated_at: new Date().toISOString(),
  }));

  const { error } = await ctx.supabase
    .from('ide_project_index')
    .upsert(rows, { onConflict: 'project_id,kind' });

  if (error) throw new ApiError(500, describeDbError(error));

  return bundle;
}

/**
 * Mark the index stale after a file mutation.
 * Best-effort: a failure here must never fail the write that triggered it.
 */
export async function markIndexStale(ctx: AuthedContext, projectId: string): Promise<void> {
  try {
    await ctx.supabase
      .from('ide_project_index')
      .update({ is_stale: true })
      .eq('project_id', projectId)
      .eq('user_id', ctx.userId);
  } catch {
    // Ignored on purpose — a stale flag is a cache hint, not correctness.
  }
}
