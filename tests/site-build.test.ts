import { describe, expect, it } from "vitest";

import { buildSiteData } from "@/lib/site";

describe("site build data", () => {
  it("builds the expected MVP corpus", async () => {
    const site = await buildSiteData();

    expect(site.pages).toHaveLength(23);
    expect(site.resourceIndex.resources).toHaveLength(18);
    expect(site.resourceIndex.schemas).toHaveLength(5);
    expect(site.resourceIndex.resources[0]?.url).toMatch(/^https:\/\/judgmentkit\.ai\//);
    expect(site.resourceIndex.schemas[0]?.url).toMatch(/^https:\/\/judgmentkit\.ai\//);
    expect(site.llms).toContain("https://judgmentkit.ai/");
    expect(site.mcpInventory.endpoint).toBe("https://judgmentkit.ai/mcp");
  });

  it("keeps every guardrail page attached to workflows and resources", async () => {
    const site = await buildSiteData();
    const guardrails = site.pages.filter(
      (page) => page.frontmatter.page_type === "guardrail",
    );

    expect(guardrails).toHaveLength(8);
    for (const page of guardrails) {
      expect(page.frontmatter.workflows?.length).toBeGreaterThan(0);
      expect(page.frontmatter.related_resources.length).toBeGreaterThan(0);
      expect(page.frontmatter.related_schemas).toContain(
        "/schemas/guardrail.schema.json",
      );
    }
  });
});
