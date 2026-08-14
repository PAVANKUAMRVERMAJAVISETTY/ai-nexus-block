import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("Phase 6 website write approval gateway", () => {
  const websiteWrite = fs.readFileSync(
    "lib/ai/website-write-tools.ts",
    "utf8"
  );

  const approval = fs.readFileSync(
    "lib/ai/website-write-approval.ts",
    "utf8"
  );

  const adminRoute = fs.readFileSync(
    "app/api/admin/agent-actions/route.ts",
    "utf8"
  );

  const executor = fs.readFileSync(
    "lib/ide/tool-executor.ts",
    "utf8"
  );

  it("website write entrypoint creates pending approval requests", () => {
    expect(websiteWrite).toContain(
      'from("agent_change_requests")'
    );
    expect(websiteWrite).toContain('status: "pending"');
    expect(websiteWrite).toContain("pendingActionId");
    expect(websiteWrite).toContain(
      "export async function applyWebsiteWriteTool"
    );
  });

  it("keeps all 12 website write tools represented", () => {
    const tools = [
      "create_project",
      "update_project",
      "delete_project",
      "create_tool",
      "update_tool",
      "delete_tool",
      "create_knowledge",
      "update_knowledge",
      "delete_knowledge",
      "create_roadmap",
      "update_roadmap",
      "delete_roadmap",
    ];

    for (const tool of tools) {
      expect(websiteWrite).toContain(`${tool}:`);
      expect(approval).toContain(`"${tool}"`);
    }
  });

  it("approval service revalidates super-admin access", () => {
    expect(approval).toContain(
      "profile.role !== \"super_admin\""
    );
    expect(approval).toContain(
      "ALLOWED_WEBSITE_TOOLS"
    );
    expect(approval).toContain(
      '.eq("status", "pending")'
    );
    expect(approval).toContain(
      'status: "applied"'
    );
  });

  it("admin route delegates approval to the secure service", () => {
    expect(adminRoute).toContain(
      "approveWebsiteChangeRequest"
    );
    expect(adminRoute).toContain(
      "rejectWebsiteChangeRequest"
    );
  });

  it("real executor preserves pendingActionId", () => {
    expect(executor).toContain(
      "pendingActionId: result.pendingActionId"
    );
  });
});
