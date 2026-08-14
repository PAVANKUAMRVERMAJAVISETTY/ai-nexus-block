import { describe, expect, it } from "vitest";
import {
  getTool,
  isWriteTool,
  validateToolCall,
} from "@/lib/ai/tools";

describe("Phase 4 website tool contract", () => {
  const tools = [
    "read_tools",
    "read_projects",
    "read_knowledge",
    "read_roadmaps",
  ] as const;

  it("registers all website tools as automatic read-only tools", () => {
    for (const name of tools) {
      expect(getTool(name)).toBeDefined();
      expect(getTool(name)?.approval).toBe("automatic");
      expect(isWriteTool(name)).toBe(false);
      expect(
        validateToolCall({ tool: name, args: {} }).tool
      ).toBe(name);
    }
  });
});
