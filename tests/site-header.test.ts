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

  it("renders home and inspect on the root route and marks home active", () => {
    usePathname.mockReturnValue("/");
    const markup = renderToStaticMarkup(createElement(SiteHeader));

    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/inspect"');
    expect(markup).toContain(">Home<");
    expect(markup).toContain(">Inspect<");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("JudgmentKit");
    expect(markup).toContain("hidden");
    expect(markup).toContain("min-[360px]:block");
    expect(markup).not.toContain("Human-first AI review");
    expect(markup).not.toContain(">Run<");
    expect(markup).not.toContain(">Proof<");
    expect(markup).not.toContain(">Context<");
  });

  it("renders home and inspect on secondary routes", () => {
    usePathname.mockReturnValue("/inspect");
    const markup = renderToStaticMarkup(createElement(SiteHeader));

    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/inspect"');
    expect(markup).toContain(">Home<");
    expect(markup).toContain(">Inspect<");
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("JudgmentKit");
    expect(markup).toContain("min-[360px]:block");
  });
});
