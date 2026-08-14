import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface WebsiteContext {
  tools: unknown[];
  projects: unknown[];
  knowledge: unknown[];
  roadmaps: unknown[];
}

export async function getWebsiteContext(
  query?: string,
): Promise<WebsiteContext> {
  const supabase = await createSupabaseServerClient();

  const q = query?.trim();

  let toolsQuery = supabase
    .from("nexus_tools")
    .select("*")
    .eq("is_published", true)
    .limit(20);

  let projectsQuery = supabase
    .from("nexus_projects")
    .select("*")
    .eq("is_published", true)
    .limit(20);

  let knowledgeQuery = supabase
    .from("nexus_knowledge")
    .select("*")
    .eq("is_published", true)
    .limit(20);

  let roadmapsQuery = supabase
    .from("nexus_roadmaps")
    .select("*")
    .eq("is_published", true)
    .limit(20);

  if (q) {
    const pattern = `%${q.replace(/[%_]/g, "")}%`;

    toolsQuery = toolsQuery.or(
      `name.ilike.${pattern},description.ilike.${pattern}`,
    );

    projectsQuery = projectsQuery.or(
      `name.ilike.${pattern},description.ilike.${pattern}`,
    );

    knowledgeQuery = knowledgeQuery.or(
      `title.ilike.${pattern},content.ilike.${pattern}`,
    );

    roadmapsQuery = roadmapsQuery.or(
      `title.ilike.${pattern},description.ilike.${pattern}`,
    );
  }

  const [tools, projects, knowledge, roadmaps] = await Promise.all([
    toolsQuery,
    projectsQuery,
    knowledgeQuery,
    roadmapsQuery,
  ]);

  return {
    tools: tools.data ?? [],
    projects: projects.data ?? [],
    knowledge: knowledge.data ?? [],
    roadmaps: roadmaps.data ?? [],
  };
}
