import type { Roadmap } from "@/types/roadmaps";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function mapRoadmap(row: Record<string, any>): Roadmap {
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
    category: metadata.category ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],

    difficulty: row.level ?? "beginner",
    estimated_hours:
      typeof metadata.estimated_hours === "number"
        ? metadata.estimated_hours
        : null,

    image_url: metadata.image_url ?? null,
    logo_url: null,
  };
}

export async function getRoadmaps(
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<Roadmap>> {
  const supabase = createSupabasePublicClient();

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("nexus_roadmaps")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("title")
    .range(from, to);

  if (error) {
    throw new Error(`Failed to load roadmaps: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    data: (data ?? []).map(mapRoadmap),
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getRoadmapBySlug(
  slug: string
): Promise<Roadmap | null> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("nexus_roadmaps")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load roadmap: ${error.message}`);
  }

  return data ? mapRoadmap(data) : null;
}

export async function getFeaturedRoadmaps(): Promise<Roadmap[]> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("nexus_roadmaps")
    .select("*")
    .eq("status", "published")
    .eq("featured", true)
    .order("title");

  if (error) {
    throw new Error(`Failed to load featured roadmaps: ${error.message}`);
  }

  return (data ?? []).map(mapRoadmap);
}
