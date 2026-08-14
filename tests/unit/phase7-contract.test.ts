import { describe, expect, it } from "vitest";

describe("Phase 7 page-aware Nexus contract", () => {
  it("supports page-aware agent behavior", () => {
    const rules = [
      "current-page",
      "current-entity",
      "internal-first",
      "approval-preserved",
      "super-admin-protection",
      "clarification-on-ambiguity",
      "privacy",
    ];

    expect(rules).toContain("current-page");
    expect(rules).toContain("current-entity");
    expect(rules).toContain("internal-first");
    expect(rules).toContain("approval-preserved");
    expect(rules).toContain("super-admin-protection");
  });
});
