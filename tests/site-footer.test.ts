import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "@/components/site-footer";

describe("site footer", () => {
  it("renders the footer on the home route", () => {
    const markup = renderToStaticMarkup(createElement(SiteFooter));

    expect(markup).toContain("© 2026");
    expect(markup).toContain("surfaces.systems");
    expect(markup).toContain("GitHub project");
    expect(markup).toContain('href="https://surfaces.systems"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer noopener"');
    expect(markup).toContain(
      'href="https://github.com/Surfaces-Platform/agentic-judgmentkit"',
    );
    expect(markup).toContain("mt-auto");
    expect(markup).toContain("min-h-[5rem]");
    expect(markup).not.toContain("max-w-7xl");
    expect(markup).not.toContain("Contact");
  });

  it("renders the simplified non-home footer", () => {
    const markup = renderToStaticMarkup(createElement(SiteFooter));

    expect(markup).toContain("© 2026");
    expect(markup).toContain("surfaces.systems");
    expect(markup).toContain("GitHub project");
    expect(markup).toContain('href="https://surfaces.systems"');
    expect(markup).toContain(
      'href="https://github.com/Surfaces-Platform/agentic-judgmentkit"',
    );
    expect(markup).toContain("mt-auto");
    expect(markup).toContain("min-h-[5rem]");
    expect(markup).not.toContain("max-w-7xl");
    expect(markup).not.toContain("Contact");
    expect(markup).not.toContain("JudgmentKit is the MCP");
    expect(markup).not.toContain("Open /inspect");
  });
});
