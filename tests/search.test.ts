import { describe, expect, it } from "vitest";

import { buildSiteData } from "@/lib/site";
import { searchDocuments } from "@/lib/search";

describe("search ranking", () => {
  it("finds artifacts by exact resource id", async () => {
    const site = await buildSiteData();
    const results = searchDocuments(
      site.searchDocuments,
      "guardrail.brand-tone",
      { kind: "resource" },
    );

    expect(results[0]?.id).toBe("guardrail.brand-tone");
  });

  it("supports provenance synonyms through the search index", async () => {
    const site = await buildSiteData();
    const results = searchDocuments(site.searchDocuments, "audit trace");

    expect(results.some((result) => result.id === "/docs/guardrails/provenance-and-escalation")).toBe(
      true,
    );
  });

  it("finds the repetitive copy calibration example through search text", async () => {
    const site = await buildSiteData();
    const results = searchDocuments(site.searchDocuments, "repetitive copy", {
      kind: "resource",
    });

    expect(results.some((result) => result.id === "example.ui-generation.repetitive-copy-drift")).toBe(
      true,
    );
  });

  it("finds the control proximity artifacts through search text", async () => {
    const site = await buildSiteData();
    const guardrailResults = searchDocuments(site.searchDocuments, "control proximity", {
      kind: "resource",
    });
    const exampleResults = searchDocuments(site.searchDocuments, "detached viewer controls", {
      kind: "resource",
    });

    expect(
      guardrailResults.some((result) => result.id === "guardrail.control-proximity"),
    ).toBe(true);
    expect(
      exampleResults.some((result) => result.id === "example.ui-generation.control-proximity-drift"),
    ).toBe(true);
  });

  it("finds the surface theme parity artifacts through search text", async () => {
    const site = await buildSiteData();
    const guardrailResults = searchDocuments(site.searchDocuments, "surface theme parity", {
      kind: "resource",
    });
    const exampleResults = searchDocuments(site.searchDocuments, "dark terminal block", {
      kind: "resource",
    });

    expect(
      guardrailResults.some((result) => result.id === "guardrail.surface-theme-parity"),
    ).toBe(true);
    expect(
      exampleResults.some(
        (result) => result.id === "example.ui-generation.surface-theme-parity-drift",
      ),
    ).toBe(true);
  });
});
