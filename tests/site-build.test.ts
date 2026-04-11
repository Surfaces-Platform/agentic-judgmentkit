import { describe, expect, it } from "vitest";

import { buildSiteData } from "@/lib/site";

describe("site build data", () => {
  it("builds the expected MVP corpus", async () => {
    const site = await buildSiteData();

    expect(site.pages).toHaveLength(21);
    expect(site.resourceIndex.resources).toHaveLength(16);
    expect(site.resourceIndex.schemas).toHaveLength(5);
  });

  it("keeps every guardrail page attached to workflows and resources", async () => {
    const site = await buildSiteData();
    const guardrails = site.pages.filter(
      (page) => page.frontmatter.page_type === "guardrail",
    );

    expect(guardrails).toHaveLength(7);
    for (const page of guardrails) {
      expect(page.frontmatter.workflows?.length).toBeGreaterThan(0);
      expect(page.frontmatter.related_resources.length).toBeGreaterThan(0);
      expect(page.frontmatter.related_schemas).toContain(
        "/schemas/guardrail.schema.json",
      );
    }
  });
});
