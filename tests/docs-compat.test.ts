import { describe, expect, it } from "vitest";

import { resolveLegacyDocsRedirect } from "@/lib/docs-compat";
import publicWorkflowResource from "@/public/resources/workflows/ai-ui-generation.v1.json";

describe("legacy docs compatibility", () => {
  it("redirects workflow, guardrail, and example docs slugs to inspect anchors", async () => {
    await expect(
      resolveLegacyDocsRedirect("/docs/workflows/ai-ui-generation"),
    ).resolves.toBe("/inspect#resource-workflow.ai-ui-generation");
    await expect(
      resolveLegacyDocsRedirect("/docs/guardrails/design-system-integrity"),
    ).resolves.toBe("/inspect#resource-guardrail.design-system-integrity");
    await expect(
      resolveLegacyDocsRedirect("/docs/examples/ui-generation-drift"),
    ).resolves.toBe("/inspect#resource-example.ui-generation.component-drift");
  });

  it("redirects start pages to the bare inspect route", async () => {
    await expect(
      resolveLegacyDocsRedirect("/docs/start/what-is-judgmentkit"),
    ).resolves.toBe("/inspect");
  });

  it("repoints generated docs_url values to inspect anchors while keeping markdown mirrors", () => {
    expect(publicWorkflowResource.links.docs_url).toBe(
      "https://judgmentkit.com/inspect#resource-workflow.ai-ui-generation",
    );
    expect(publicWorkflowResource.links.markdown_url).toBe(
      "https://judgmentkit.com/docs/workflows/ai-ui-generation.md",
    );
  });
});
