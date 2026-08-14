import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function resolveAdminClient() {
  const module = await import("../lib/supabase/admin");
  const exported = module as Record<string, unknown>;

  for (const [key, value] of Object.entries(exported)) {
    if (
      /admin/i.test(key) &&
      typeof value === "function"
    ) {
      const result = (value as () => unknown)();

      if (
        result &&
        typeof result === "object" &&
        typeof (result as { from?: unknown }).from === "function"
      ) {
        return result as {
          from: (table: string) => any;
        };
      }
    }
  }

  for (const value of Object.values(exported)) {
    if (
      value &&
      typeof value === "object" &&
      typeof (value as { from?: unknown }).from === "function"
    ) {
      return value as {
        from: (table: string) => any;
      };
    }
  }

  throw new Error(
    "Could not resolve existing Supabase admin client."
  );
}

async function main() {
  const admin = await resolveAdminClient();

  const tables = [
    "nexus_projects",
    "nexus_tools",
    "nexus_knowledge",
    "nexus_roadmaps",
  ];

  for (const table of tables) {
    const { error } = await admin
      .from(table)
      .select("id")
      .limit(1);

    if (error) {
      throw new Error(
        `${table}: ${error.message}`
      );
    }

    console.log(`${table}: PASS`);
  }

  const { error: auditError } = await admin
    .from("ai_agent_actions")
    .select("id")
    .limit(1);

  if (auditError) {
    throw new Error(
      `ai_agent_actions: ${auditError.message}`
    );
  }

  console.log("ai_agent_actions: PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
