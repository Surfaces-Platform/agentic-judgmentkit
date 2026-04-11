import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

import { SiteFooter } from "@/components/site-footer";

describe("site footer", () => {
  beforeEach(() => {
    usePathname.mockReset();
  });

  it("hides the footer on the home route", () => {
    usePathname.mockReturnValue("/");
    const markup = renderToStaticMarkup(createElement(SiteFooter));

    expect(markup).toBe("");
  });

  it("renders the simplified non-home footer", () => {
    usePathname.mockReturnValue("/inspect");
    const markup = renderToStaticMarkup(createElement(SiteFooter));

    expect(markup).toContain("© 2026");
    expect(markup).toContain("surfaces.systems");
    expect(markup).toContain('href="https://surfaces.systems"');
    expect(markup).not.toContain("JudgmentKit is the MCP");
    expect(markup).not.toContain("Open /inspect");
  });
});
