import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  InspectSurface,
  formatInspectJsonText,
  resolveInspectResourceIdFromHash,
} from "@/components/inspect-surface";
import { getPrompt } from "@/lib/mcp";
import { loadProductSurface } from "@/lib/product-surface";
import rawExampleArtifact from "@/public/resources/examples/ui-generation-drift.v1.json";

describe("product surface content", () => {
  it("defines the three install targets and the derived loaded context", () => {
    const content = loadProductSurface("https://judgmentkit.ai/mcp");

    expect(content.install_targets.map((target) => target.id)).toEqual([
      "codex",
      "claude",
      "cursor",
    ]);
    expect(content.install_targets[0]).toMatchObject({
      transport: "http",
      connection_label: "URL",
      connection_value: "https://judgmentkit.ai/mcp",
      config_path: "~/.codex/config.toml",
      install_note:
        "Connect directly to the hosted JudgmentKit MCP and restart Codex.",
    });
    expect(content.install_targets[1]).toMatchObject({
      transport: "http",
      connection_label: "URL",
      connection_value: "https://judgmentkit.ai/mcp",
      config_path: ".mcp.json",
      install_note:
        "Connect directly to the hosted JudgmentKit MCP and restart Claude after adding the server.",
    });
    expect(content.install_targets[2]).toMatchObject({
      transport: "http",
      connection_label: "URL",
      connection_value: "https://judgmentkit.ai/mcp",
      config_path: "~/.cursor/mcp.json",
      install_note:
        "Connect directly to the hosted JudgmentKit MCP and reload Cursor if needed.",
    });
    expect(content.install_targets[1].config_snippet).toContain(
      '"url": "https://judgmentkit.ai/mcp"',
    );
    expect(content.install_targets[2].config_snippet).toContain(
      '"url": "https://judgmentkit.ai/mcp"',
    );
    expect(content.loaded_context.map((item) => item.id)).toEqual([
      "workflow.ai-ui-generation",
      "guardrail.design-system-integrity",
      "guardrail.ui-copy-clarity",
      "guardrail.control-proximity",
      "guardrail.runtime-cost",
      "guardrail.provenance-escalation",
      "example.ui-generation.component-drift",
      "example.ui-generation.embellishment-drift",
      "example.ui-generation.onboarding-clarity-drift",
      "example.ui-generation.repetitive-copy-drift",
      "example.ui-generation.control-proximity-drift",
    ]);
  });

  it("keeps the raw artifact references available for the inspect route", () => {
    const content = loadProductSurface("https://judgmentkit.ai/mcp");
    const urls = content.reference_links.map((link) => link.url);

    expect(content.inspect).toEqual({
      href: "/inspect",
      label: "Browse raw references",
      description:
        "Use the published endpoint, indexes, mirrors, and schema files when you need to verify what is deployed or read the machine-facing artifacts outside the inline browser.",
    });
    expect(urls).toContain("/mcp");
    expect(urls).toContain("/mcp-inventory.json");
    expect(urls).toContain("/llms.txt");
    expect(urls).toContain("/resources/index.json");
    expect(urls).toContain("/resources/workflows/ai-ui-generation.v1.json");
    expect(urls).toContain("/docs/workflows/ai-ui-generation.md");
    expect(urls).toContain("/schemas/workflow.schema.json");
  });

  it("sources the first message from the canonical MCP prompt", () => {
    const content = loadProductSurface("https://judgmentkit.ai/mcp");
    const prompt = getPrompt("start_design_workflow");

    expect("error" in prompt).toBe(false);
    if ("error" in prompt) {
      return;
    }

    expect(content.first_message).toBe(prompt.template);
    expect(content.starter_prompt_name).toBe(prompt.name);
  });

  it("sources the proof from the published example artifact", () => {
    const content = loadProductSurface("https://judgmentkit.ai/mcp");

    expect(content.proof.example_id).toBe(rawExampleArtifact.id);
    expect(content.proof.workflow_id).toBe(rawExampleArtifact.workflow_id);
    expect(content.proof.brief_text).toBe(rawExampleArtifact.scenario);
    expect(content.proof.uncontrolled_text).toBe(rawExampleArtifact.raw_output);
    expect(content.proof.guided_text).toBe(rawExampleArtifact.corrected_output);
  });

  it("renders anchored resource references on the inspect surface", () => {
    const content = loadProductSurface("https://judgmentkit.ai/mcp");
    const markup = renderToStaticMarkup(
      createElement(InspectSurface, { content }),
    );

    expect(markup).toContain("inspect-browser-shell");
    expect(markup).toContain(">Examples<");
    expect(markup).toContain(">Guardrails<");
    expect(markup).toContain(">Workflows<");
    expect(markup).toContain("Published endpoints and files");
    expect(markup).toContain("Live MCP");
    expect(markup).toContain("Core artifacts");
    expect(markup).toContain("Docs mirrors");
    expect(markup).toContain("Workflow resource");
    expect(markup).toContain("Example resource");
    expect(markup).toContain("Workflow mirror");
    expect(markup).toContain("Example mirror");
    expect(markup).toContain("inspect-viewer-toolbar");
    expect(markup).toContain('aria-label="Open published resources"');
    expect(markup).toContain('aria-controls="inspect-resource-rail"');
    expect(markup).toContain('id="inspect-resource-rail"');
    expect(markup).toContain("fixed inset-y-0 left-0 z-50");
    expect(markup).toContain("w-[min(18rem,calc(100vw-2rem))]");
    expect(markup).toContain("-translate-x-full");
    expect(markup).toContain("fixed inset-0 z-40");
    expect(markup).toContain("md:grid-cols-[15rem,minmax(0,1fr)]");
    expect(markup).toContain("lg:grid-cols-[18rem,minmax(0,1fr)]");
    expect(markup).toContain("md:border-l");
    expect(markup).toContain("md:px-3");
    expect(markup).toContain('id="resource-workflow.ai-ui-generation"');
    expect(markup).toContain('href="/resources/workflows/ai-ui-generation.v1.json"');
    expect(markup).toContain('href="/mcp"');
    expect(markup).toContain('href="/resources/index.json"');
    expect(markup).toContain('href="/schemas/workflow.schema.json"');
    expect(markup).not.toContain("Inspect published JudgmentKit resources");
    expect(markup).not.toContain("Resource browser");
    expect(markup).not.toContain("Resource library");
    expect(markup).not.toContain("Select a published resource to load its JSON and schema in place.");
    expect(markup).not.toContain("Utility links");
    expect(markup).not.toContain("JSON viewer");
    expect(markup).not.toContain("Schema viewer");
    expect(markup).not.toContain("Copy JSON");
    expect(markup).not.toContain("Copy schema");
    expect(markup).not.toContain("Open raw JSON");
    expect(markup).not.toContain("Open schema");
    expect(markup).not.toContain("theme-chip");
    expect(markup).not.toContain("Advanced surface");
    expect(markup).not.toContain("Back to run surface");
    expect(markup).not.toContain("Direct machine surfaces");
    expect(markup).not.toContain("Workflow JSON");
    expect(markup).not.toContain("Example JSON");
    expect(markup).not.toContain("AI UI generation markdown");
    expect(markup).not.toContain("UI generation drift markdown");
    expect(markup).not.toContain("gap-6");
    expect(markup).not.toContain('class="grid lg:grid-cols-[18rem,minmax(0,1fr)]"');
    expect(markup).not.toContain('class="theme-divider min-w-0 border-t md:border-l md:border-t-0"');
    expect(markup.indexOf("Last reviewed")).toBeLessThan(markup.indexOf(">JSON<"));
  });

  it("resolves inspect resources from legacy hash anchors", () => {
    const content = loadProductSurface("https://judgmentkit.ai/mcp");

    expect(
      resolveInspectResourceIdFromHash(
        "#resource-workflow.ai-ui-generation",
        content.inspect_resources,
      ),
    ).toBe("workflow.ai-ui-generation");
    expect(
      resolveInspectResourceIdFromHash(
        "#resource-missing",
        content.inspect_resources,
      ),
    ).toBe(content.inspect_resources[0].id);
  });

  it("formats fetched JSON for the inline viewer", () => {
    expect(formatInspectJsonText('{"id":"workflow.ai-ui-generation","version":1}')).toBe(
      '{\n  "id": "workflow.ai-ui-generation",\n  "version": 1\n}\n',
    );
  });
});
