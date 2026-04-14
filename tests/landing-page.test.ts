import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LandingPage } from "@/components/landing-page";
import { loadLandingPage } from "@/lib/landing-page";

describe("landing page", () => {
  it("loads the simplified agent-driven homepage content", () => {
    const content = loadLandingPage();

    expect(content.eyebrow).toBe("Judgment for AI agents");
    expect(content.headline).toBe(
      "JudgmentKit gives your agent workflow guidance, guardrails, and verification.",
    );
    expect(content.install_options).toEqual([
      {
        id: "codex",
        label: "Codex",
        command: "curl -fsSL https://judgmentkit.ai/install | bash -s -- --client codex",
      },
      {
        id: "claude",
        label: "Claude",
        command: "curl -fsSL https://judgmentkit.ai/install | bash -s -- --client claude",
      },
      {
        id: "cursor",
        label: "Cursor",
        command: "curl -fsSL https://judgmentkit.ai/install | bash -s -- --client cursor",
      },
    ]);
    expect(content.install_command).toBe(
      "curl -fsSL https://judgmentkit.ai/install | bash -s -- --client <codex|claude|cursor>",
    );
    expect(content.verify_prompt).toBe(
      "Call MCP tools/list against the local judgmentkit server",
    );
  });

  it("keeps the centered stack while right-aligning client selectors with the installer heading", () => {
    const content = loadLandingPage();
    const markup = renderToStaticMarkup(createElement(LandingPage, { content }));

    expect(markup).toContain(
      "JudgmentKit gives your agent workflow guidance, guardrails, and verification.",
    );
    expect(markup).toContain("Codex");
    expect(markup).toContain("Claude");
    expect(markup).toContain("Cursor");
    expect(markup).toContain("Run the installer");
    expect(markup).toContain("Verify locally");
    expect(markup).toContain('aria-label="Copy Codex install command"');
    expect(markup).toContain('aria-label="Copy verify prompt"');
    expect(markup).toContain('class="mx-auto flex w-full max-w-[42rem] flex-col items-center text-center"');
    expect(markup).toContain(
      'class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"',
    );
    expect(markup).toContain('class="flex flex-wrap gap-1.5 sm:justify-end"');
    expect(markup).toContain(
      "curl -fsSL https://judgmentkit.ai/install | bash -s -- --client codex",
    );
    expect(markup).toContain("Call MCP tools/list against the local judgmentkit server");
    expect(markup).not.toContain("Manual fallback");
    expect(markup).not.toContain("through MCP");
    expect(markup).not.toContain("~/.codex/config.toml");
    expect(markup).not.toContain(".mcp.json");
    expect(markup).not.toContain("~/.cursor/mcp.json");
    expect(markup).not.toContain("&lt;ABSOLUTE_PATH_TO_LOCAL_JUDGMENTKIT_CHECKOUT&gt;");
    expect(markup).not.toContain(
      "curl -fsSL https://judgmentkit.ai/install | bash -s -- --client &lt;codex|claude|cursor&gt;",
    );
    expect(markup).not.toContain("landing-flat-panel");
    expect(markup).not.toContain("lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]");
    expect(markup).not.toContain("Two prompts. That is the whole setup.");
    expect(markup).not.toContain("Open JudgmentKit reference");
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
    expect(markup).not.toContain("Use the install contract, command anchors, published artifacts, and hosted debug surfaces");
    expect(markup).not.toContain("Do not configure the client");
    expect(markup).not.toContain('href="/inspect"');
  });
});
