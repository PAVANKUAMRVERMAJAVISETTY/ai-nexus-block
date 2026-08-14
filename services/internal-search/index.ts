import { createSupabaseServerClient } from "@/lib/supabase/server";

export type InternalSearchEntity =
  | "tools"
  | "projects"
  | "knowledge"
  | "roadmaps"
  | "all";

export interface InternalSearchResult {
  entity: InternalSearchEntity;
  id: string;
  slug?: string;
  title: string;
  description?: string;
  relevance: number;
  data: Record<string, unknown>;
}

type SearchTableName =
  | "nexus_tools"
  | "nexus_projects"
  | "nexus_knowledge"
  | "nexus_roadmaps";

function normalizeQuery(value: string): string {
  return value
    .trim()
    .replace(/[%_]/g, "")
    .replace(/[(),.!?;:()[\]{}"'`]/g, " ")
    .replace(/\s+/g, " ");
}

function getText(
  row: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "about",
  "be",
  "by",
  "can",
  "currently",
  "do",
  "for",
  "from",
  "get",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "please",
  "tell",
  "the",
  "this",
  "to",
  "what",
  "which",
  "with",
  "you",
  "your",
]);

function tokenize(value: string): string[] {
  return Array.from(
    new Set(
      normalizeQuery(value)
        .toLowerCase()
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
    ),
  );
}

function isListingQuery(query: string): boolean {
  const normalized = normalizeQuery(query).toLowerCase();

  return (
    /\b(what|which|show|list|give)\b/.test(normalized) &&
    /\b(listed|available|currently|projects|tools|knowledge|roadmaps)\b/.test(
      normalized,
    )
  );
}

function inferEntityFromQuery(
  query: string,
): Exclude<InternalSearchEntity, "all"> | null {
  const normalized = normalizeQuery(query).toLowerCase();

  if (/\bprojects?\b/.test(normalized)) return "projects";
  if (/\btools?\b/.test(normalized)) return "tools";
  if (/\bknowledge\b|\btopics?\b/.test(normalized)) return "knowledge";
  if (/\broadmaps?\b|\broad maps?\b/.test(normalized)) return "roadmaps";

  return null;
}

function calculateRelevance(
  row: Record<string, unknown>,
  query: string,
): number {
  const normalizedQuery = normalizeQuery(query).toLowerCase();
  const queryTokens = tokenize(query);

  const title = (
    getText(row, "title", "name") ?? ""
  ).toLowerCase();

  const slug = (
    getText(row, "slug") ?? ""
  ).toLowerCase();

  const description = (
    getText(row, "description", "summary", "content", "long_description") ?? ""
  ).toLowerCase();

  let score = 0;

  // Exact phrase matches get the strongest signal.
  if (title === normalizedQuery) score += 200;
  if (title.includes(normalizedQuery)) score += 120;
  if (slug.includes(normalizedQuery)) score += 80;
  if (description.includes(normalizedQuery)) score += 40;

  // Natural-language questions are scored word-by-word.
  for (const token of queryTokens) {
    if (title === token) score += 80;
    else if (title.includes(token)) score += 30;

    if (slug.includes(token)) score += 20;

    if (description.includes(token)) score += 8;
  }

  return score;
}

async function searchTable(
  table: SearchTableName,
  entity: Exclude<InternalSearchEntity, "all">,
  query: string,
  listingQuery = false,
): Promise<InternalSearchResult[]> {
  const supabase = await createSupabaseServerClient();

  let request = supabase
    .from(table)
    .select("*")
    .limit(100);

  // IMPORTANT:
  // nexus_projects uses status='published'.
  // The other Nexus content tables use is_published=true.
  if (table === "nexus_projects") {
    request = request.eq("status", "published");
  } else {
    request = request.eq("is_published", true);
  }

  const { data, error } = await request;

  if (error) {
    console.error(
      `[internal-search] Failed to search ${table}:`,
      error.message,
    );
    return [];
  }

  if (!data) {
    return [];
  }

  const rows = data as unknown as Record<string, unknown>[];
  const queryTokens = tokenize(query);

  return rows
    .map((row): InternalSearchResult => {
      const title =
        getText(row, "title", "name") ??
        getText(row, "slug") ??
        String(row.id);

      const description = getText(
        row,
        "description",
        "summary",
        "content",
        "long_description",
      );

      const relevance = calculateRelevance(row, query);

      return {
        entity,
        id: String(row.id),
        slug: getText(row, "slug"),
        title,
        description:
          description && description.length > 500
            ? description.slice(0, 500)
            : description,
        relevance,
        data: row,
      };
    })
    .filter((result) => {
      // Listing queries intentionally return every published record.
      // Specific queries use relevance filtering.
      if (listingQuery) return true;

      // An empty token set should never return arbitrary content.
      if (queryTokens.length === 0) return false;

      return result.relevance > 0;
    });
}

export async function searchInternalWebsite(
  query: string,
  entity: InternalSearchEntity = "all",
): Promise<InternalSearchResult[]> {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const listingQuery = isListingQuery(normalizedQuery);

  // When the caller asks a broad "what projects are listed?" question,
  // infer the requested entity so we return the complete published collection
  // instead of requiring every row to match the wording of the question.
  const inferredEntity = inferEntityFromQuery(normalizedQuery);

  const effectiveEntity =
    entity === "all" && listingQuery && inferredEntity
      ? inferredEntity
      : entity;

  const tasks: Promise<InternalSearchResult[]>[] = [];

  if (entity === "all" || entity === "tools") {
    tasks.push(
      searchTable("nexus_tools", "tools", normalizedQuery, listingQuery),
    );
  }

  if (entity === "all" || entity === "projects") {
    tasks.push(
      searchTable("nexus_projects", "projects", normalizedQuery, listingQuery),
    );
  }

  if (entity === "all" || entity === "knowledge") {
    tasks.push(
      searchTable("nexus_knowledge", "knowledge", normalizedQuery, listingQuery),
    );
  }

  if (entity === "all" || entity === "roadmaps") {
    tasks.push(
      searchTable("nexus_roadmaps", "roadmaps", normalizedQuery, listingQuery),
    );
  }

  const groups = await Promise.all(tasks);

  const results = groups.flat();

  return listingQuery
    ? results
        .sort((a, b) => a.title.localeCompare(b.title))
        .slice(0, 50)
    : results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 20);
}

