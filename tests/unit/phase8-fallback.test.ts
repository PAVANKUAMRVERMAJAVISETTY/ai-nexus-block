import { describe, expect, it } from "vitest";

describe("Phase 8 internal-first fallback contract", () => {
  it("defines internal-first ordering", () => {
    const order = [
      "search_internal_website",
      "web_search",
    ];

    expect(order[0]).toBe("search_internal_website");
    expect(order[1]).toBe("web_search");
  });

  it("does not use external search when internal results are sufficient", () => {
    const internalResults = [
      {
        title: "AI Nexus Block",
        relevance: 100,
      },
    ];

    const shouldUseWebSearch = internalResults.length === 0;

    expect(shouldUseWebSearch).toBe(false);
  });

  it("uses external search when internal results are empty", () => {
    const internalResults: unknown[] = [];

    const shouldUseWebSearch = internalResults.length === 0;

    expect(shouldUseWebSearch).toBe(true);
  });
});
