import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingPage } from "@/components/landing-page";
import { loadLandingPage } from "@/lib/landing-page";

describe("landing page", () => {
  it("loads the simplified agent-driven homepage content", () => {
    const content = loadLandingPage();

    expect(content.eyebrow).toBe("Judgment for AI agents");
    expect(content.headline).toBe("Install JudgmentKit before your agent starts the first draft.");
    expect(content.install_prompt).toContain("https://judgmentkit.ai/install");
    expect(content.verify_prompt).toContain("tools/list");
  });

  it("renders the install and verify prompts without client cards", () => {
    const content = loadLandingPage();
    const markup = renderToStaticMarkup(createElement(LandingPage, { content }));

    expect(markup).toContain("Install JudgmentKit before your agent starts the first draft.");
    expect(markup).toContain("Install JudgmentKit");
    expect(markup).toContain("Verify JudgmentKit");
    expect(markup).toContain("Copy install prompt");
    expect(markup).toContain("Copy verify prompt");
    expect(markup).toContain("https://judgmentkit.ai/install");
    expect(markup).toContain("tools/list");
    expect(markup).toContain('href="/inspect"');
    expect(markup).toContain("Inspect raw references");
    expect(markup).not.toContain("Codex");
    expect(markup).not.toContain("Claude");
    expect(markup).not.toContain("Cursor");
    expect(markup).not.toContain("~/.codex/config.toml");
    expect(markup).not.toContain(".mcp.json");
    expect(markup).not.toContain("~/.cursor/mcp.json");
    expect(markup).not.toContain("&lt;ABSOLUTE_PATH_TO_JUDGMENTKIT_REPO&gt;");
    expect(markup).not.toContain("Two prompts. That is the whole setup.");
  });

  it("keeps the old workflow, proof, dogfood, and install-card sections off the homepage", () => {
    const content = loadLandingPage();
    const markup = renderToStaticMarkup(createElement(LandingPage, { content }));

    expect(markup).not.toContain('id="workflow"');
    expect(markup).not.toContain("From first draft to next pass.");
    expect(markup).not.toContain("See what guides the review.");
    expect(markup).not.toContain("Dogfooded on this page");
    expect(markup).not.toContain("Feature intent");
    expect(markup).not.toContain("Draft packet");
    expect(markup).not.toContain("Review checklist");
    expect(markup).not.toContain('href="/mcp"');
    expect(markup).not.toContain('href="/mcp-inventory.json"');
    expect(markup).not.toContain('href="/resources/index.json"');
    expect(markup).not.toContain('href="/resources/workflows/ai-ui-generation.v1.json"');
    expect(markup).not.toContain("Copy/paste into your client");
    expect(markup).not.toContain("What happens next");
    expect(markup).not.toContain("Add JudgmentKit locally");
    expect(markup).not.toContain("Start the workflow");
    expect(markup).not.toContain("Use the published endpoint, indexes, mirrors, and schema files");
  });
});
