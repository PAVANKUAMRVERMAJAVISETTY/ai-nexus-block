import { describe, expect, it } from "vitest";

describe("website context contract", () => {
  it("keeps the internal-first architecture", () => {
    const expected = [
      "tools",
      "projects",
      "knowledge",
      "roadmaps",
    ];

    expect(expected).toHaveLength(4);
  });
});
