import { NextResponse } from 'next/server';
import {
  ApiError,
  byteLength,
  enforceRateLimit,
  describeDbError,
  readJsonBody,
  requireProject,
  requireUser,
  toErrorResponse,
  type AuthedContext,
} from '@/lib/ide/api';
import {
  ancestorDirectories,
  basename,
  dirname,
  isWithin,
  normalizeProjectPath,
  rebasePath,
} from '@/lib/ide/paths';
import { detectLanguage, isBinaryPath } from '@/lib/ide/languages';
import { buildFileTree } from '@/lib/ide/tree';
import type { IdeFile, IdeFileOrigin } from '@/types/ide';

export const dynamic = 'force-dynamic';

/** Hard ceilings so one project cannot exhaust the database or the browser. */
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_FILES_PER_PROJECT = 2000;

interface RouteParams {
  params: { projectId: string };
}

const FILE_SUMMARY_COLUMNS =
  'id, project_id, user_id, file_path, filename, parent_path, language, size, is_directory, is_binary, content_hash, origin, created_at, updated_at';

/**
 * Create any missing ancestor directory rows for `path`.
 * Conflicts are ignored, so concurrent writes into the same folder are safe.
 */
async function ensureDirectoryRows(
  ctx: AuthedContext,
  projectId: string,
  path: string
): Promise<void> {
  const ancestors = ancestorDirectories(path);
  if (!ancestors.length) return;

  const rows = ancestors.map((dir) => ({
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
    origin: 'user' as IdeFileOrigin,
  }));

  await ctx.supabase
    .from('ide_project_files')
    .upsert(rows, { onConflict: 'project_id,file_path', ignoreDuplicates: true });
}

async function countFiles(ctx: AuthedContext, projectId: string): Promise<number> {
  const { count } = await ctx.supabase
    .from('ide_project_files')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);
  return count ?? 0;
}

/**
 * Every row strictly beneath `dirPath`.
 *
 * Deliberately not a SQL `LIKE 'dir/%'` query: `%` and `_` are legal in a
 * project path and would act as wildcards, so a folder named `a_b` would also
 * match `axb`. Projects are capped at MAX_FILES_PER_PROJECT rows, so filtering
 * in memory is both safe and cheap.
 */
async function listDescendants(
  ctx: AuthedContext,
  projectId: string,
  dirPath: string,
  columns: string
): Promise<IdeFile[]> {
  const { data, error } = await ctx.supabase
    .from('ide_project_files')
    .select(columns)
    .eq('project_id', projectId);

  if (error) throw new ApiError(500, describeDbError(error));

  return ((data ?? []) as unknown as IdeFile[]).filter(
    (row) => row.file_path !== dirPath && isWithin(dirPath, row.file_path)
  );
}

/**
 * GET /api/ide/projects/:id/files
 *   (no query)      → metadata for every file + the assembled tree
 *   ?path=<path>    → a single file including its content
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    const project = await requireProject(ctx, params.projectId);

    const url = new URL(request.url);
    const rawPath = url.searchParams.get('path');

    if (rawPath) {
      const filePath = normalizeProjectPath(rawPath);

      const { data, error } = await ctx.supabase
        .from('ide_project_files')
        .select('*')
        .eq('project_id', project.id)
        .eq('file_path', filePath)
        .maybeSingle();

      if (error) throw new ApiError(500, describeDbError(error));
      if (!data) throw new ApiError(404, `File not found: ${filePath}`);

      return NextResponse.json({ file: data as IdeFile });
    }

    const { data, error } = await ctx.supabase
      .from('ide_project_files')
      .select(FILE_SUMMARY_COLUMNS)
      .eq('project_id', project.id)
      .order('file_path', { ascending: true });

    if (error) throw new ApiError(500, describeDbError(error));

    const files = (data ?? []) as unknown as Parameters<typeof buildFileTree>[0];

    return NextResponse.json({ files, tree: buildFileTree(files) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * POST /api/ide/projects/:id/files
 * Create a file or directory. Fails if the path already exists.
 * Body: { path, content?, isDirectory?, origin? }
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    enforceRateLimit(ctx.userId, 'write');

    const project = await requireProject(ctx, params.projectId);
    const body = await readJsonBody(request);

    const filePath = normalizeProjectPath(body.path);
    const isDirectory = body.isDirectory === true;
    const content = isDirectory ? '' : typeof body.content === 'string' ? body.content : '';

    if (byteLength(content) > MAX_FILE_BYTES) {
      throw new ApiError(413, `File exceeds the ${MAX_FILE_BYTES / 1024}KB limit.`);
    }
    if (!isDirectory && isBinaryPath(filePath)) {
      throw new ApiError(
        400,
        'Binary files cannot be created in the editor. Import them through a repository connection instead.'
      );
    }

    if ((await countFiles(ctx, project.id)) >= MAX_FILES_PER_PROJECT) {
      throw new ApiError(413, `Projects are limited to ${MAX_FILES_PER_PROJECT} entries.`);
    }

    await ensureDirectoryRows(ctx, project.id, filePath);

    const { data, error } = await ctx.supabase
      .from('ide_project_files')
      .insert({
        project_id: project.id,
        user_id: ctx.userId,
        file_path: filePath,
        filename: basename(filePath),
        parent_path: dirname(filePath),
        content,
        language: isDirectory ? 'plaintext' : detectLanguage(filePath),
        size: byteLength(content),
        is_directory: isDirectory,
        is_binary: false,
        origin: body.origin === 'ai' ? 'ai' : 'user',
      })
      .select('*')
      .single();

    if (error) throw new ApiError(error.code === '23505' ? 409 : 400, describeDbError(error));

    return NextResponse.json({ file: data as IdeFile }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * PUT /api/ide/projects/:id/files
 * Save file content. Body: { path, content }
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    enforceRateLimit(ctx.userId, 'write');

    const project = await requireProject(ctx, params.projectId);
    const body = await readJsonBody(request);

    const filePath = normalizeProjectPath(body.path);
    if (typeof body.content !== 'string') {
      throw new ApiError(400, '"content" must be a string.');
    }
    if (byteLength(body.content) > MAX_FILE_BYTES) {
      throw new ApiError(413, `File exceeds the ${MAX_FILE_BYTES / 1024}KB limit.`);
    }

    const { data: existing, error: findError } = await ctx.supabase
      .from('ide_project_files')
      .select('id, is_directory')
      .eq('project_id', project.id)
      .eq('file_path', filePath)
      .maybeSingle();

    if (findError) throw new ApiError(500, describeDbError(findError));
    if (!existing) throw new ApiError(404, `File not found: ${filePath}`);
    if (existing.is_directory) throw new ApiError(400, 'Cannot write content to a directory.');

    const { data, error } = await ctx.supabase
      .from('ide_project_files')
      .update({
        content: body.content,
        size: byteLength(body.content),
        language: detectLanguage(filePath),
      })
      .eq('id', existing.id)
      .eq('user_id', ctx.userId)
      .select('*')
      .single();

    if (error) throw new ApiError(400, describeDbError(error));

    return NextResponse.json({ file: data as IdeFile });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * PATCH /api/ide/projects/:id/files
 * Rename/move: { op: 'rename', path, newPath }
 * Duplicate:   { op: 'duplicate', path, newPath }
 * Renaming a directory rewrites every descendant path.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    enforceRateLimit(ctx.userId, 'write');

    const project = await requireProject(ctx, params.projectId);
    const body = await readJsonBody(request);

    const op = body.op === 'duplicate' ? 'duplicate' : 'rename';
    const fromPath = normalizeProjectPath(body.path);
    const toPath = normalizeProjectPath(body.newPath);

    if (fromPath === toPath) {
      throw new ApiError(400, 'The new path is identical to the current path.');
    }
    if (op === 'rename' && isWithin(fromPath, toPath)) {
      throw new ApiError(400, 'A directory cannot be moved inside itself.');
    }

    const { data: source, error: sourceError } = await ctx.supabase
      .from('ide_project_files')
      .select('*')
      .eq('project_id', project.id)
      .eq('file_path', fromPath)
      .maybeSingle();

    if (sourceError) throw new ApiError(500, describeDbError(sourceError));
    if (!source) throw new ApiError(404, `Path not found: ${fromPath}`);

    const { data: collision } = await ctx.supabase
      .from('ide_project_files')
      .select('id')
      .eq('project_id', project.id)
      .eq('file_path', toPath)
      .maybeSingle();

    if (collision) throw new ApiError(409, `A file already exists at ${toPath}.`);

    await ensureDirectoryRows(ctx, project.id, toPath);

    // Collect the source row plus, for directories, every descendant.
    const rowsToProcess: IdeFile[] = [source as IdeFile];
    if (source.is_directory) {
      rowsToProcess.push(...(await listDescendants(ctx, project.id, fromPath, '*')));
    }

    if (op === 'duplicate') {
      const copies = rowsToProcess.map((row) => {
        const newPath = rebasePath(row.file_path, fromPath, toPath);
        return {
          project_id: project.id,
          user_id: ctx.userId,
          file_path: newPath,
          filename: basename(newPath),
          parent_path: dirname(newPath),
          content: row.content,
          language: row.is_directory ? 'plaintext' : detectLanguage(newPath),
          size: row.size,
          is_directory: row.is_directory,
          is_binary: row.is_binary,
          origin: 'user' as IdeFileOrigin,
        };
      });

      if ((await countFiles(ctx, project.id)) + copies.length > MAX_FILES_PER_PROJECT) {
        throw new ApiError(413, `Projects are limited to ${MAX_FILES_PER_PROJECT} entries.`);
      }

      const { error } = await ctx.supabase.from('ide_project_files').insert(copies);
      if (error) throw new ApiError(400, describeDbError(error));

      return NextResponse.json({ success: true, op, affected: copies.length });
    }

    // Rename: update each affected row's path fields.
    // Supabase has no multi-row-different-value update, so this is a per-row
    // update. Bounded by MAX_FILES_PER_PROJECT and only hit on directory moves.
    let affected = 0;
    for (const row of rowsToProcess) {
      const newPath = rebasePath(row.file_path, fromPath, toPath);
      const { error } = await ctx.supabase
        .from('ide_project_files')
        .update({
          file_path: newPath,
          filename: basename(newPath),
          parent_path: dirname(newPath),
          language: row.is_directory ? 'plaintext' : detectLanguage(newPath),
        })
        .eq('id', row.id)
        .eq('user_id', ctx.userId);

      if (error) {
        throw new ApiError(
          400,
          `Rename partially failed at ${row.file_path}: ${describeDbError(error)}`
        );
      }
      affected += 1;
    }

    return NextResponse.json({ success: true, op, affected, from: fromPath, to: toPath });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * DELETE /api/ide/projects/:id/files?path=<path>
 * Deleting a directory removes every descendant. The UI confirms first.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    const project = await requireProject(ctx, params.projectId);

    const rawPath = new URL(request.url).searchParams.get('path');
    const filePath = normalizeProjectPath(rawPath);

    const { data: target, error: findError } = await ctx.supabase
      .from('ide_project_files')
      .select('id, is_directory')
      .eq('project_id', project.id)
      .eq('file_path', filePath)
      .maybeSingle();

    if (findError) throw new ApiError(500, describeDbError(findError));
    if (!target) throw new ApiError(404, `Path not found: ${filePath}`);

    let removedPaths: string[] = [filePath];

    if (target.is_directory) {
      const descendants = await listDescendants(ctx, project.id, filePath, 'id, file_path');
      removedPaths = [filePath, ...descendants.map((d) => d.file_path)];

      if (descendants.length) {
        const { error } = await ctx.supabase
          .from('ide_project_files')
          .delete()
          .eq('user_id', ctx.userId)
          .in(
            'id',
            descendants.map((d) => d.id)
          );

        if (error) throw new ApiError(400, describeDbError(error));
      }
    }

    const { error } = await ctx.supabase
      .from('ide_project_files')
      .delete()
      .eq('id', target.id)
      .eq('user_id', ctx.userId);

    if (error) throw new ApiError(400, describeDbError(error));

    return NextResponse.json({ success: true, removedPaths });
  } catch (error) {
    return toErrorResponse(error);
  }
}
