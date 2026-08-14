import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { getTools } from "@/services/tools";
import { getProjects } from "@/services/projects";
import { getKnowledgeArticles } from "@/services/knowledge";
import { getRoadmaps } from "@/services/roadmaps";

async function main() {
  console.log("Next environment: loaded");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing after loadEnvConfig()");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY is missing after loadEnvConfig()"
    );
  }

  console.log("Public Supabase configuration: READY");

  const tools = await getTools();
  const projects = await getProjects();
  const knowledge = await getKnowledgeArticles();
  const roadmaps = await getRoadmaps();

  console.log("");
  console.log("SUPABASE PUBLIC SERVICE COUNTS");
  console.log("----------------------------------------");
  console.log(`Tools: ${tools.count}`);
  console.log(`Projects: ${projects.count}`);
  console.log(`Knowledge: ${knowledge.count}`);
  console.log(`Roadmaps: ${roadmaps.count}`);

  console.log("");
  console.log("SLUGS");

  for (const item of tools.data) {
    console.log(`TOOL => ${item.slug}`);
  }

  for (const item of projects.data) {
    console.log(`PROJECT => ${item.slug}`);
  }

  for (const item of knowledge.data) {
    console.log(`KNOWLEDGE => ${item.slug}`);
  }

  for (const item of roadmaps.data) {
    console.log(`ROADMAP => ${item.slug}`);
  }

  if (
    tools.count !== 2 ||
    projects.count !== 2 ||
    knowledge.count !== 2 ||
    roadmaps.count !== 2
  ) {
    throw new Error(
      "Unexpected content counts. Expected 2 rows in every content table."
    );
  }

  console.log("");
  console.log("PUBLIC SERVICES -> SUPABASE: PASS");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
