import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readWorkspaceFile(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

describe("theme-matched code blocks", () => {
  it("defines theme-relative code surfaces in globals.css", async () => {
    const css = await readWorkspaceFile("app/globals.css");

    expect(css).toContain("--theme-code-surface: #efe7da;");
    expect(css).not.toContain("--theme-code-surface: #09111d;");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("--theme-code-surface: #050a12;");
    expect(css).toContain(".theme-code-block {");
    expect(css).toContain("background: var(--theme-code-surface);");
    expect(css).toContain(".prose-judgment pre {");
    expect(css).toContain("color: var(--theme-code-text);");
  });

  it("reuses the shared code-block class across landing and inspect surfaces", async () => {
    const landingPage = await readWorkspaceFile("components/landing-page.tsx");
    const inspectSurface = await readWorkspaceFile("components/inspect-surface.tsx");

    expect(landingPage).toContain("theme-code-block landing-flat-code");
    expect(inspectSurface.match(/theme-code-block/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
