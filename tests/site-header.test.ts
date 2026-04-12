import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

import { SiteHeader } from "@/components/site-header";

describe("site header", () => {
  beforeEach(() => {
    usePathname.mockReset();
  });

  it("renders home, get started, and reference on the root route and marks home active", () => {
    usePathname.mockReturnValue("/");
    const markup = renderToStaticMarkup(createElement(SiteHeader));

    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/inspect"');
    expect(markup).toContain('href="/reference"');
    expect(markup).toContain(">Home<");
    expect(markup).toContain(">Get Started<");
    expect(markup).toContain(">Reference<");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("JudgmentKit");
    expect(markup).toContain("hidden");
    expect(markup).toContain("min-[360px]:block");
    expect(markup).toContain("min-h-[4.75rem]");
    expect(markup).toContain("w-full");
    expect(markup).not.toContain("max-w-7xl");
    expect(markup).not.toContain("Human-first AI review");
    expect(markup).not.toContain(">Run<");
    expect(markup).not.toContain(">Proof<");
    expect(markup).not.toContain(">Context<");
  });

  it("marks get started active on the inspect route", () => {
    usePathname.mockReturnValue("/inspect");
    const markup = renderToStaticMarkup(createElement(SiteHeader));

    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/inspect"');
    expect(markup).toContain('href="/reference"');
    expect(markup).toContain(">Home<");
    expect(markup).toContain(">Get Started<");
    expect(markup).toContain(">Reference<");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("JudgmentKit");
    expect(markup).toContain("min-[360px]:block");
    expect(markup).toContain("min-h-[4.75rem]");
    expect(markup).toContain("w-full");
    expect(markup).not.toContain("max-w-7xl");
  });

  it("marks reference active on reference-style routes", () => {
    usePathname.mockReturnValue("/reference");
    const markup = renderToStaticMarkup(createElement(SiteHeader));

    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/inspect"');
    expect(markup).toContain('href="/reference"');
    expect(markup).toContain(">Home<");
    expect(markup).toContain(">Get Started<");
    expect(markup).toContain(">Reference<");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("JudgmentKit");
    expect(markup).toContain("min-[360px]:block");
    expect(markup).toContain("min-h-[4.75rem]");
    expect(markup).toContain("w-full");
    expect(markup).not.toContain("max-w-7xl");
  });
});
