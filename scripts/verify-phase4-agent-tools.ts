import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { validateToolCall } = await import("@/lib/ai/tools");
  const { executeWebsiteTool } = await import("@/lib/ai/website-tools");

  const expected = {
    read_tools: "nexus_tools",
    read_projects: "nexus_projects",
    read_knowledge: "nexus_knowledge",
    read_roadmaps: "nexus_roadmaps",
  } as const;

  for (const tool of Object.keys(expected) as Array<keyof typeof expected>) {

    const call = validateToolCall({
      tool,
      args: {},
      reason: "phase-4-real-read",
    });

    const result = await executeWebsiteTool(call);

    if (!result.ok) {
      throw new Error(`${tool}: ${result.content}`);
    }

    if (!result.content.includes(expected[tool])) {
      throw new Error(
        `${tool}: expected ${expected[tool]} in result`
      );
    }

    console.log(`${tool}: PASS -> ${expected[tool]}`);
  }

  console.log("");
  console.log("PHASE 4 REAL WEBSITE DATA: PASS");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
