import type { Tool } from "@/types/tools";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function mapTool(row: Record<string, any>): Tool {
  const pricing =
    row.pricing && typeof row.pricing === "object"
      ? row.pricing
      : {};

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

    name: row.name,
    slug: row.slug,
    description: row.description ?? row.tagline ?? "",
    category: row.category ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],

    pricing: pricing.value ?? "free",
    pricing_details: pricing.details ?? null,
    is_open_source: Boolean(metadata.is_open_source),

    image_url: row.image_url ?? null,
    logo_url: row.logo_url ?? null,

    website_url: row.website_url ?? null,
    github_url: metadata.github_url ?? null,
    documentation_url: row.documentation_url ?? null,
    youtube_url: metadata.youtube_url ?? null,
  };
}

export async function getTools(
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<Tool>> {
  const supabase = createSupabasePublicClient();

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("nexus_tools")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("name")
    .range(from, to);

  if (error) {
    throw new Error(`Failed to load tools: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    data: (data ?? []).map(mapTool),
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getToolBySlug(
  slug: string
): Promise<Tool | null> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("nexus_tools")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tool: ${error.message}`);
  }

  return data ? mapTool(data) : null;
}

export async function getFeaturedTools(): Promise<Tool[]> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("nexus_tools")
    .select("*")
    .eq("status", "published")
    .eq("featured", true)
    .order("name");

  if (error) {
    throw new Error(`Failed to load featured tools: ${error.message}`);
  }

  return (data ?? []).map(mapTool);
}
