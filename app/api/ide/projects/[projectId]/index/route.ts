import { NextResponse } from 'next/server';
import { requireProject, requireUser, toErrorResponse } from '@/lib/ide/api';
import { rebuildIndex } from '@/lib/ide/index-service';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { projectId: string };
}

/** GET /api/ide/projects/:id/index — cached index, rebuilt when missing or stale. */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    const project = await requireProject(ctx, params.projectId);

    const force = new URL(request.url).searchParams.get('refresh') === 'true';

    if (!force) {
      const { data } = await ctx.supabase
        .from('ide_project_index')
        .select('kind, payload, is_stale, generated_at, file_count')
        .eq('project_id', project.id);

      const rows = (data ?? []) as {
        kind: string;
        payload: Record<string, unknown>;
        is_stale: boolean;
        generated_at: string;
        file_count: number;
      }[];

      const fresh = rows.length >= 4 && rows.every((row) => !row.is_stale);

      if (fresh) {
        const byKind = Object.fromEntries(rows.map((row) => [row.kind, row.payload]));
        return NextResponse.json({
          cached: true,
          generatedAt: rows[0]?.generated_at ?? null,
          fileCount: rows[0]?.file_count ?? 0,
          overview: byKind.overview ?? null,
          modules: (byKind.modules as { modules?: unknown })?.modules ?? [],
          routes: (byKind.routes as { routes?: unknown })?.routes ?? [],
          tree: (byKind.tree as { tree?: unknown })?.tree ?? [],
        });
      }
    }

    const bundle = await rebuildIndex(ctx, project);

    return NextResponse.json({
      cached: false,
      generatedAt: new Date().toISOString(),
      fileCount: bundle.overview.fileCount,
      overview: bundle.overview,
      modules: bundle.modules,
      routes: bundle.routes,
      tree: bundle.tree,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/ide/projects/:id/index — force a rebuild. */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const ctx = await requireUser();
    const project = await requireProject(ctx, params.projectId);
    const bundle = await rebuildIndex(ctx, project);

    return NextResponse.json({
      rebuilt: true,
      overview: bundle.overview,
      moduleCount: bundle.modules.length,
      routeCount: bundle.routes.length,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
