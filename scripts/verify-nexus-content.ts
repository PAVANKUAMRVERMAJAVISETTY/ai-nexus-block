import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function main() {
  console.log("Next environment: loaded");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing after loadEnvConfig()");
  }

  console.log("Supabase server credentials: READY");

  const supabase = createSupabaseAdminClient();

  const tables = [
    "nexus_tools",
    "nexus_projects",
    "nexus_knowledge",
    "nexus_roadmaps",
  ];

  let failed = false;

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select("id,slug,status,featured")
      .order("slug");

    if (error) {
      console.log(`${table} => FAILED: ${error.message}`);
      failed = true;
      continue;
    }

    console.log("");
    console.log(`--- ${table} ---`);

    for (const row of data ?? []) {
      console.log(JSON.stringify(row));
    }

    console.log(`${table} => ${data?.length ?? 0} rows`);
  }

  if (failed) {
    process.exit(1);
  }

  console.log("");
  console.log("DATABASE VERIFICATION SUCCESS");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
