import { describe, expect, it } from "vitest";

import { buildSiteData } from "@/lib/site";

describe("site build data", () => {
  it("builds the expected MVP corpus", async () => {
    const site = await buildSiteData();

    expect(site.pages.length).toBeGreaterThanOrEqual(29);
    expect(site.resourceIndex.resources.length).toBeGreaterThanOrEqual(24);
    expect(site.resourceIndex.schemas.length).toBeGreaterThanOrEqual(6);
    expect(site.resourceIndex.resources[0]?.url).toMatch(/^https:\/\/judgmentkit\.ai\//);
    expect(site.resourceIndex.schemas[0]?.url).toMatch(/^https:\/\/judgmentkit\.ai\//);
    expect(
      site.resourceIndex.resources.some(
        (resource) => resource.id === "guideline-profile.ai-ui-generation-authority",
      ),
    ).toBe(true);
    expect(
      site.resourceIndex.schemas.some((schema) =>
        schema.url.endsWith("/schemas/guideline_profile.schema.json"),
      ),
    ).toBe(true);
    expect(site.llms).toContain("https://judgmentkit.ai/");
    expect(site.mcpInventory.endpoint).toBe("http://127.0.0.1:8765/mcp");
    expect(site.mcpInventory.hosted_reference_endpoint).toBe("https://judgmentkit.ai/mcp");
    expect(site.mcpInventory.install_transport).toBe("http");
    expect(site.mcpInventory.local_loopback_runtime.start_command).toBe(
      "npm --prefix <ABSOLUTE_PATH_TO_LOCAL_JUDGMENTKIT_CHECKOUT> run mcp:local",
    );
    expect(site.mcpInventory.command_reference_url).toBe(
      "https://judgmentkit.ai/inspect#commands",
    );
    expect(site.mcpInventory.tool_reference).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "get_workflow_bundle",
          docs_url: "https://judgmentkit.ai/inspect#tool-get_workflow_bundle",
        }),
      ]),
    );
  });

  it("keeps every guardrail page attached to workflows and resources", async () => {
    const site = await buildSiteData();
    const guardrails = site.pages.filter(
      (page) => page.frontmatter.page_type === "guardrail",
    );

    expect(guardrails).toHaveLength(13);
    for (const page of guardrails) {
      expect(page.frontmatter.workflows?.length).toBeGreaterThan(0);
      expect(page.frontmatter.related_resources.length).toBeGreaterThan(0);
      expect(page.frontmatter.related_schemas).toContain(
        "/schemas/guardrail.schema.json",
      );
    }
  });
});
