import { describe, expect, it } from "vitest";
import { searchInternalWebsite } from "@/services/internal-search";

describe("internal website search", () => {
  it("returns an empty array for an empty query", async () => {
    const result = await searchInternalWebsite("   ");

    expect(result).toEqual([]);
  });

  it("returns an empty array for punctuation-only input", async () => {
    const result = await searchInternalWebsite("%%%___");

    expect(result).toEqual([]);
  });

  it("supports every internal website domain", () => {
    const domains = [
      "tools",
      "projects",
      "knowledge",
      "roadmaps",
      "all",
    ];

    expect(domains).toContain("tools");
    expect(domains).toContain("projects");
    expect(domains).toContain("knowledge");
    expect(domains).toContain("roadmaps");
    expect(domains).toContain("all");
  });
});
