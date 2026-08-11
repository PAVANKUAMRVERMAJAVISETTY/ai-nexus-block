import { NextResponse } from 'next/server';
import {
  ApiError,
  byteLength,
  describeDbError,
  optionalString,
  readJsonBody,
  requireString,
  requireUser,
  slugify,
  toErrorResponse,
} from '@/lib/ide/api';
import { normalizeProjectPath, dirname, basename } from '@/lib/ide/paths';
import { detectLanguage } from '@/lib/ide/languages';
import { getTemplate, defaultTemplateId, ideTemplates } from '@/lib/ide/templates';

export const dynamic = 'force-dynamic';

/** GET /api/ide/projects — list the signed-in user's IDE projects. */
export async function GET() {
  try {
    const ctx = await requireUser();

    const { data, error } = await ctx.supabase
      .from('ide_projects')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('last_opened_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (error) throw new ApiError(500, describeDbError(error));

    return NextResponse.json({
      projects: data ?? [],
      templates: ideTemplates.map((t) => ({
        id: t.id,
        label: t.label,
        description: t.description,
        category: t.category,
        framework: t.framework,
        primaryLanguage: t.primaryLanguage,
        packageManager: t.packageManager,
        learn: t.learn,
        fileCount: t.files.length,
      })),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/ide/projects — create a project and materialize its template. */
export async function POST(request: Request) {
  try {
    const ctx = await requireUser();
    const body = await readJsonBody(request);

    const name = requireString(body, 'name', 120);
    const description = optionalString(body, 'description', 1000);
    const templateId =
      typeof body.template === 'string' && body.template ? body.template : defaultTemplateId;

    const template = getTemplate(templateId);
    if (!template) {
      throw new ApiError(400, `Unknown project template "${templateId}".`);
    }

    // Make the slug unique per user without a round trip per attempt.
    const baseSlug = slugify(name);
    const { data: existingSlugs } = await ctx.supabase
      .from('ide_projects')
      .select('slug')
      .eq('user_id', ctx.userId)
      .like('slug', `${baseSlug}%`);

    const taken = new Set((existingSlugs ?? []).map((row: { slug: string | null }) => row.slug));
    let slug = baseSlug;
    let suffix = 2;
    while (taken.has(slug)) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const { data: project, error: projectError } = await ctx.supabase
      .from('ide_projects')
      .insert({
        user_id: ctx.userId,
        name,
        slug,
        description,
        template: template.id,
        framework: template.framework,
        primary_language: template.primaryLanguage,
        package_manager: template.packageManager,
        workspace_hint: slug,
        status: 'active',
        last_opened_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (projectError || !project) {
      throw new ApiError(400, describeDbError(projectError ?? { message: 'Insert failed.' }));
    }

    // Materialize template files through the same normalization user writes use.
    const directories = new Set<string>();
    const fileRows = template.files.map((file) => {
      const path = normalizeProjectPath(file.path);
      let parent = dirname(path);
      while (parent) {
        directories.add(parent);
        parent = dirname(parent);
      }
      return {
        project_id: project.id,
        user_id: ctx.userId,
        file_path: path,
        filename: basename(path),
        parent_path: dirname(path),
        content: file.content,
        language: detectLanguage(path),
        size: byteLength(file.content),
        is_directory: false,
        is_binary: false,
        origin: 'template' as const,
      };
    });

    const directoryRows = Array.from(directories).map((path) => ({
      project_id: project.id,
      user_id: ctx.userId,
      file_path: path,
      filename: basename(path),
      parent_path: dirname(path),
      content: '',
      language: 'plaintext',
      size: 0,
      is_directory: true,
      is_binary: false,
      origin: 'template' as const,
    }));

    const allRows = [...directoryRows, ...fileRows];

    if (allRows.length) {
      const { error: filesError } = await ctx.supabase.from('ide_project_files').insert(allRows);

      if (filesError) {
        // Do not leave a half-built project behind.
        await ctx.supabase.from('ide_projects').delete().eq('id', project.id).eq('user_id', ctx.userId);
        throw new ApiError(400, describeDbError(filesError));
      }
    }

    return NextResponse.json({ project, fileCount: allRows.length }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
