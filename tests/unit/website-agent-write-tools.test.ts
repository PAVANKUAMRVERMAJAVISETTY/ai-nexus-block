import { describe, expect, it } from "vitest";
import { isWriteTool } from "@/lib/ai/tools";
import fs from "node:fs";
import path from "node:path";

const writeTools = [
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
] as const;

describe("Phase 5 website write tools", () => {
  it("registers all 12 website write tools", () => {
    for (const name of writeTools) {
      expect(isWriteTool(name)).toBe(true);
    }
  });

  it("contains all 12 write tools in the real website write executor", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "lib",
        "ai",
        "website-write-tools.ts"
      ),
      "utf8"
    );

    for (const name of writeTools) {
      expect(source).toContain(`${name}:`);
    }
  });

  it("contains all 12 write tools in the real IDE executor", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "lib",
        "ide",
        "tool-executor.ts"
      ),
      "utf8"
    );

    for (const name of writeTools) {
      expect(source).toContain(`case "${name}"`);
    }
  });

  it("does not contain the old malformed read_roadmaps corruption", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "lib",
        "ai",
        "tools.ts"
      ),
      "utf8"
    );

    expect(source).not.toContain(
      'name: "read_roadmaps",    "delete_roadmap"'
    );
  });
});
