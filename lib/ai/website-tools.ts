import type { ToolCall, ToolName } from "@/lib/ai/tools";
import { getTools } from "@/services/tools";
import { getProjects } from "@/services/projects";
import { getKnowledgeArticles } from "@/services/knowledge";
import { getRoadmaps } from "@/services/roadmaps";

export type WebsiteReadTool =
  | "read_tools"
  | "read_projects"
  | "read_knowledge"
  | "read_roadmaps";

const WEBSITE_READ_TOOLS = new Set<WebsiteReadTool>([
  "read_tools",
  "read_projects",
  "read_knowledge",
  "read_roadmaps",
]);

export function isWebsiteTool(tool: ToolName): tool is WebsiteReadTool {
  return WEBSITE_READ_TOOLS.has(tool as WebsiteReadTool);
}

function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export async function executeWebsiteTool(
  call: Pick<ToolCall, "tool">
): Promise<{ ok: true; content: string } | { ok: false; content: string }> {
  try {
    switch (call.tool) {
      case "read_tools": {
        const result = await getTools();

        return {
          ok: true,
          content: serialize({
            source: "website.nexus_tools",
            count: result.count,
            items: result.data,
          }),
        };
      }

      case "read_projects": {
        const result = await getProjects();

        return {
          ok: true,
          content: serialize({
            source: "website.nexus_projects",
            count: result.count,
            items: result.data,
          }),
        };
      }

      case "read_knowledge": {
        const result = await getKnowledgeArticles();

        return {
          ok: true,
          content: serialize({
            source: "website.nexus_knowledge",
            count: result.count,
            items: result.data,
          }),
        };
      }

      case "read_roadmaps": {
        const result = await getRoadmaps();

        return {
          ok: true,
          content: serialize({
            source: "website.nexus_roadmaps",
            count: result.count,
            items: result.data,
          }),
        };
      }

      default:
        return {
          ok: false,
          content: `Unsupported website tool: ${String(call.tool)}`,
        };
    }
  } catch (error) {
    return {
      ok: false,
      content:
        error instanceof Error
          ? `Website data read failed: ${error.message}`
          : "Website data read failed.",
    };
  }
}
