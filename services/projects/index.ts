import type { Project } from "@/types/projects";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function mapProject(row: Record<string, any>): Project {
  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? row.metadata
      : {};

  const now = new Date().toISOString();

  return {
    id: row.id,
    created_at: row.created_at ?? metadata.original_created_at ?? now,
    updated_at: row.updated_at ?? metadata.original_updated_at ?? now,
    featured: Boolean(row.featured),
    published: row.status === "published",
    display_order:
      typeof metadata.display_order === "number"
        ? metadata.display_order
        : 0,

    title: row.title,
    slug: row.slug,
    description: row.description ?? "",
    long_description: row.long_description ?? null,

    category: row.project_type ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],

    live_url: row.live_url ?? null,
    zip_file_url: row.zip_file_url ?? metadata.zip_file_url ?? null,
    image_url: row.image_url ?? null,

    website_url: row.live_url ?? null,
    github_url: row.repository_url ?? null,
    documentation_url: metadata.documentation_url ?? null,
    youtube_url: metadata.youtube_url ?? null,

    is_case_study: Boolean(metadata.is_case_study),
  };
}

export async function getProjects(
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<Project>> {
  const supabase = createSupabasePublicClient();

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("nexus_projects")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("title")
    .range(from, to);

  if (error) {
    throw new Error(`Failed to load projects: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    data: (data ?? []).map(mapProject),
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getProjectBySlug(
  slug: string
): Promise<Project | null> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("nexus_projects")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load project: ${error.message}`);
  }

  return data ? mapProject(data) : null;
}

export async function getFeaturedProjects(): Promise<Project[]> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("nexus_projects")
    .select("*")
    .eq("status", "published")
    .eq("featured", true)
    .order("title");

  if (error) {
    throw new Error(`Failed to load featured projects: ${error.message}`);
  }

  return (data ?? []).map(mapProject);
}
