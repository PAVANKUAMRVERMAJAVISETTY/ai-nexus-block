import { describe, expect, it } from "vitest";
import { getPageContext } from "@/lib/ai/page-context";

describe("page context", () => {
  it("detects home", async () => {
    const result = await getPageContext("/");
    expect(result.pageType).toBe("home");
  });

  it("detects collection pages", async () => {
    expect((await getPageContext("/tools")).pageType).toBe("tools");
    expect((await getPageContext("/projects")).pageType).toBe("projects");
    expect((await getPageContext("/knowledge")).pageType).toBe("knowledge");
    expect((await getPageContext("/roadmaps")).pageType).toBe("roadmaps");
  });

  it("detects admin and IDE", async () => {
    expect((await getPageContext("/admin")).pageType).toBe("admin");
    expect((await getPageContext("/ide")).pageType).toBe("ide");
  });
});
