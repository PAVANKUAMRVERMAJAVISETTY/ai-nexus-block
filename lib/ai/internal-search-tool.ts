import {
  searchInternalWebsite,
  type InternalSearchEntity,
} from "@/services/internal-search";

export async function executeInternalWebsiteSearchTool(
  query: string,
  entity: InternalSearchEntity = "all",
) {
  const results = await searchInternalWebsite(query, entity);

  return {
    ok: true,
    content: JSON.stringify(
      {
        source: "internal_website",
        query,
        entity,
        results,
      },
      null,
      2,
    ),
  };
}
