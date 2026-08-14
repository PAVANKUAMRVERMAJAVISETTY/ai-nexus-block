import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type AnyRecord = Record<string, any>;

function unwrapCollection(value: any): AnyRecord[] {
  if (Array.isArray(value)) return value;

  for (const candidate of [
    value?.data,
    value?.items,
    value?.results,
    value?.articles,
    value?.tools,
    value?.projects,
    value?.roadmaps,
  ]) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Expected collection array but received: " +
    JSON.stringify(value).slice(0, 1500)
  );
}

function pick(
  item: AnyRecord,
  ...keys: string[]
): any {
  for (const key of keys) {
    if (
      item[key] !== undefined &&
      item[key] !== null
    ) {
      return item[key];
    }
  }

  return undefined;
}

function str(
  item: AnyRecord,
  ...keys: string[]
): string | null {
  const value = pick(item, ...keys);

  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  return String(value);
}

function arr(
  item: AnyRecord,
  ...keys: string[]
): any[] {
  const value = pick(item, ...keys);

  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

function obj(
  item: AnyRecord,
  ...keys: string[]
): Record<string, any> {
  const value = pick(item, ...keys);

  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value;
  }

  return {};
}

function bool(
  item: AnyRecord,
  ...keys: string[]
): boolean {
  return Boolean(
    pick(item, ...keys)
  );
}

function statusFromPublished(
  item: AnyRecord
): "draft" | "published" | "archived" {
  const explicit = str(
    item,
    "status",
    "state"
  );

  if (
    explicit === "draft" ||
    explicit === "published" ||
    explicit === "archived"
  ) {
    return explicit;
  }

  return bool(
    item,
    "published",
    "is_published"
  )
    ? "published"
    : "draft";
}

async function importModule(
  relativePath: string
) {
  return import(
    pathToFileURL(
      path.resolve(
        process.cwd(),
        relativePath
      )
    ).href
  );
}

function getFunction(
  moduleValue: AnyRecord,
  names: string[]
) {
  for (const name of names) {
    if (
      typeof moduleValue[name] ===
      "function"
    ) {
      return moduleValue[name];
    }
  }

  throw new Error(
    "Function not found. Tried: " +
    names.join(", ")
  );
}

async function loadTools() {
  const mod =
    await importModule(
      "services/tools/index.ts"
    );

  const fn = getFunction(
    mod,
    ["getTools"]
  );

  return unwrapCollection(
    await fn()
  );
}

async function loadProjects() {
  const mod =
    await importModule(
      "services/projects/index.ts"
    );

  const fn = getFunction(
    mod,
    ["getProjects"]
  );

  return unwrapCollection(
    await fn()
  );
}

async function loadKnowledge() {
  const mod =
    await importModule(
      "services/knowledge/index.ts"
    );

  const fn = getFunction(
    mod,
    ["getKnowledgeArticles"]
  );

  return unwrapCollection(
    await fn()
  );
}

async function loadRoadmaps() {
  // Roadmaps are currently defined directly in
  // the active public page, so import the page source
  // and extract the exported runtime data through a
  // small source transformation instead of guessing
  // a nonexistent service.
  const fs =
    await import("node:fs/promises");

  const source =
    await fs.readFile(
      path.resolve(
        process.cwd(),
        "app/(public)/roadmaps/page.tsx"
      ),
      "utf8"
    );

  const start =
    source.indexOf(
      "const mockRoadmaps = ["
    );

  if (start < 0) {
    throw new Error(
      "mockRoadmaps declaration not found."
    );
  }

  const end =
    source.indexOf(
      "];",
      start
    );

  if (end < 0) {
    throw new Error(
      "mockRoadmaps closing bracket not found."
    );
  }

  const arrayText =
    source
      .slice(
        start +
          "const mockRoadmaps = ".length,
        end + 1
      )
      .trim();

  // These roadmap objects are simple literals.
  // Convert TypeScript-only assertions to valid JS.
  const jsText =
    arrayText
      .replace(
        / as const/g,
        ""
      );

  const factory = new Function(
    `return (${jsText});`
  );

  return factory();
}

function mapTool(
  item: AnyRecord
) {
  return {
    slug:
      str(
        item,
        "slug"
      )!,
    name:
      str(
        item,
        "name",
        "title"
      )!,
    tagline:
      str(
        item,
        "tagline",
        "subtitle"
      ),
    description:
      str(
        item,
        "description",
        "summary"
      ),
    category:
      str(
        item,
        "category",
        "type"
      ),
    website_url:
      str(
        item,
        "website_url",
        "url"
      ),
    documentation_url:
      str(
        item,
        "documentation_url",
        "docsUrl"
      ),
    logo_url:
      str(
        item,
        "logo_url"
      ),
    features:
      arr(
        item,
        "features"
      ),
    use_cases:
      arr(
        item,
        "use_cases",
        "useCases"
      ),
    tags:
      arr(
        item,
        "tags"
      ),
    pricing:
      {
        value:
          pick(
            item,
            "pricing"
          ),
        details:
          str(
            item,
            "pricing_details"
          ),
      },
    metadata:
      {
        id:
          str(
            item,
            "id"
          ),
        github_url:
          str(
            item,
            "github_url"
          ),
        youtube_url:
          str(
            item,
            "youtube_url"
          ),
        is_open_source:
          bool(
            item,
            "is_open_source"
          ),
        display_order:
          pick(
            item,
            "display_order"
          ),
        original_created_at:
          str(
            item,
            "created_at"
          ),
        original_updated_at:
          str(
            item,
            "updated_at"
          ),
      },
    featured:
      bool(
        item,
        "featured"
      ),
    status:
      statusFromPublished(item),
  };
}

function mapProject(
  item: AnyRecord
) {
  return {
    slug:
      str(
        item,
        "slug"
      )!,
    title:
      str(
        item,
        "title",
        "name"
      )!,
    description:
      str(
        item,
        "description"
      ),
    long_description:
      str(
        item,
        "long_description",
        "longDescription"
      ),
    project_type:
      str(
        item,
        "category",
        "project_type",
        "projectType"
      ),
    status:
      statusFromPublished(item),
    tags:
      arr(
        item,
        "tags"
      ),
    tech_stack:
      arr(
        item,
        "tech_stack",
        "technologies"
      ),
    features:
      arr(
        item,
        "features"
      ),
    architecture:
      obj(
        item,
        "architecture"
      ),
    repository_url:
      str(
        item,
        "github_url",
        "repository_url"
      ),
    live_url:
      str(
        item,
        "live_url",
        "url"
      ),
    image_url:
      str(
        item,
        "image_url",
        "image"
      ),
    metadata:
      {
        id:
          str(
            item,
            "id"
          ),
        documentation_url:
          str(
            item,
            "documentation_url"
          ),
        youtube_url:
          str(
            item,
            "youtube_url"
          ),
        is_case_study:
          bool(
            item,
            "is_case_study"
          ),
        display_order:
          pick(
            item,
            "display_order"
          ),
        original_created_at:
          str(
            item,
            "created_at"
          ),
        original_updated_at:
          str(
            item,
            "updated_at"
          ),
      },
    featured:
      bool(
        item,
        "featured"
      ),
  };
}

function mapKnowledge(
  item: AnyRecord
) {
  return {
    slug:
      str(
        item,
        "slug"
      )!,
    title:
      str(
        item,
        "title"
      )!,
    excerpt:
      str(
        item,
        "excerpt"
      ),
    content:
      str(
        item,
        "content"
      ),
    category:
      str(
        item,
        "category"
      ),
    tags:
      arr(
        item,
        "tags"
      ),
    source_urls:
      [],
    metadata:
      {
        id:
          str(
            item,
            "id"
          ),
        image_url:
          str(
            item,
            "image_url"
          ),
        documentation_url:
          str(
            item,
            "documentation_url"
          ),
        youtube_url:
          str(
            item,
            "youtube_url"
          ),
        reading_time_minutes:
          pick(
            item,
            "reading_time_minutes"
          ),
        is_pinned:
          bool(
            item,
            "is_pinned"
          ),
        display_order:
          pick(
            item,
            "display_order"
          ),
        original_created_at:
          str(
            item,
            "created_at"
          ),
        original_updated_at:
          str(
            item,
            "updated_at"
          ),
      },
    featured:
      bool(
        item,
        "featured"
      ),
    status:
      statusFromPublished(item),
  };
}

function mapRoadmap(
  item: AnyRecord
) {
  return {
    slug:
      str(
        item,
        "slug"
      )!,
    title:
      str(
        item,
        "title"
      )!,
    description:
      str(
        item,
        "description"
      ),
    level:
      str(
        item,
        "difficulty",
        "level"
      ),
    steps:
      [],
    prerequisites:
      [],
    technologies:
      [],
    tags:
      arr(
        item,
        "tags"
      ),
    metadata:
      {
        id:
          str(
            item,
            "id"
          ),
        estimated_hours:
          pick(
            item,
            "estimated_hours"
          ),
        category:
          str(
            item,
            "category"
          ),
        image_url:
          str(
            item,
            "image_url"
          ),
        display_order:
          pick(
            item,
            "display_order"
          ),
        original_created_at:
          str(
            item,
            "created_at"
          ),
        original_updated_at:
          str(
            item,
            "updated_at"
          ),
      },
    featured:
      bool(
        item,
        "featured"
      ),
    status:
      statusFromPublished(item),
  };
}

async function upsert(
  supabase: any,
  table: string,
  rows: AnyRecord[]
) {
  if (!rows.length) {
    console.log(
      `${table}: 0 rows`
    );
    return;
  }

  const { error } =
    await supabase
      .from(table)
      .upsert(
        rows,
        {
          onConflict: "slug",
        }
      );

  if (error) {
    throw new Error(
      `${table}: ${error.message}`
    );
  }

  console.log(
    `${table}: upserted ${rows.length} rows`
  );
}

async function verify(
  supabase: any,
  table: string
) {
  const { count, error } =
    await supabase
      .from(table)
      .select(
        "*",
        {
          count: "exact",
          head: true,
        }
      );

  if (error) {
    throw new Error(
      `${table} verification: ${error.message}`
    );
  }

  console.log(
    `${table}: ${count ?? 0} rows`
  );
}

async function main() {
  const {
    createSupabaseAdminClient
  } =
    await import(
      "@/lib/supabase/admin"
    );

  const supabase =
    createSupabaseAdminClient();

  console.log(
    "Existing Supabase admin client: READY"
  );

  const tools =
    await loadTools();

  const projects =
    await loadProjects();

  const knowledge =
    await loadKnowledge();

  const roadmaps =
    await loadRoadmaps();

  console.log("");
  console.log(
    `TOOLS: ${tools.length}`
  );
  console.log(
    `PROJECTS: ${projects.length}`
  );
  console.log(
    `KNOWLEDGE: ${knowledge.length}`
  );
  console.log(
    `ROADMAPS: ${roadmaps.length}`
  );

  const toolRows =
    tools.map(mapTool);

  const projectRows =
    projects.map(mapProject);

  const knowledgeRows =
    knowledge.map(mapKnowledge);

  const roadmapRows =
    roadmaps.map(mapRoadmap);

  console.log("");
  console.log(
    "Writing real website content to Supabase..."
  );

  await upsert(
    supabase,
    "nexus_tools",
    toolRows
  );

  await upsert(
    supabase,
    "nexus_projects",
    projectRows
  );

  await upsert(
    supabase,
    "nexus_knowledge",
    knowledgeRows
  );

  await upsert(
    supabase,
    "nexus_roadmaps",
    roadmapRows
  );

  console.log("");
  console.log(
    "DATABASE VERIFICATION"
  );

  await verify(
    supabase,
    "nexus_tools"
  );

  await verify(
    supabase,
    "nexus_projects"
  );

  await verify(
    supabase,
    "nexus_knowledge"
  );

  await verify(
    supabase,
    "nexus_roadmaps"
  );

  console.log("");
  console.log(
    "CONTENT MIGRATION SUCCESS"
  );
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "CONTENT MIGRATION FAILED"
    );

    console.error(
      error instanceof Error
        ? error.stack ??
          error.message
        : error
    );

    process.exit(1);
  }
);



