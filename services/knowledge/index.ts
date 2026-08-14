import type { KnowledgeArticle } from "@/types/knowledge";
import { createSupabasePublicClient } from "@/lib/supabase/public";

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function mapKnowledge(row: Record<string, any>): KnowledgeArticle {
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
    excerpt: row.excerpt ?? "",
    content: row.content ?? "",
    category: row.category ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],

    reading_time_minutes:
      typeof metadata.reading_time_minutes === "number"
        ? metadata.reading_time_minutes
        : null,

    is_pinned: Boolean(metadata.is_pinned),

    image_url: metadata.image_url ?? null,
    logo_url: null,
    website_url: null,
    github_url: null,
    documentation_url: metadata.documentation_url ?? null,
    youtube_url: metadata.youtube_url ?? null,
  };
}

export async function getKnowledgeArticles(
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<KnowledgeArticle>> {
  const supabase = createSupabasePublicClient();

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("nexus_knowledge")
    .select("*", { count: "exact" })
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("title")
    .range(from, to);

  if (error) {
    throw new Error(`Failed to load knowledge: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    data: (data ?? []).map(mapKnowledge),
    count: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getKnowledgeArticleBySlug(
  slug: string
): Promise<KnowledgeArticle | null> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("nexus_knowledge")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load knowledge article: ${error.message}`);
  }

  return data ? mapKnowledge(data) : null;
}

export async function getFeaturedKnowledge(): Promise<KnowledgeArticle[]> {
  const supabase = createSupabasePublicClient();

  const { data, error } = await supabase
    .from("nexus_knowledge")
    .select("*")
    .eq("status", "published")
    .eq("featured", true)
    .order("title");

  if (error) {
    throw new Error(`Failed to load featured knowledge: ${error.message}`);
  }

  return (data ?? []).map(mapKnowledge);
}
