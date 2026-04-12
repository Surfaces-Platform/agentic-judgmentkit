import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("root layout shell", () => {
  it("uses a flex column shell so the footer can anchor to the viewport bottom", () => {
    const source = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");

    expect(source).toContain('<body className="flex min-h-screen flex-col font-sans antialiased">');
    expect(source).toContain('<main id="main-content" className="flex-1">');
  });
});
