import { describe, expect, it } from "vitest";

import { resolveSiteUrl } from "@/lib/constants";

describe("site url resolution", () => {
  it("prefers the explicit site url override", () => {
    expect(
      resolveSiteUrl({
        JUDGMENTKIT_SITE_URL: "https://judgmentkit.ai",
        VERCEL_PROJECT_PRODUCTION_URL: "preview.vercel.app",
        VERCEL_URL: "branch-preview.vercel.app",
      }),
    ).toBe("https://judgmentkit.ai");
  });

  it("uses the Vercel production domain before preview domains", () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "judgmentkit-ai.vercel.app",
        VERCEL_URL: "branch-preview.vercel.app",
      }),
    ).toBe("https://judgmentkit-ai.vercel.app");
  });

  it("falls back to the preview branch host when no canonical override exists", () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "agentic-judgmentkit-git-main-surfaces-platform.vercel.app",
        VERCEL_URL: "agentic-judgmentkit-preview.vercel.app",
      }),
    ).toBe("https://agentic-judgmentkit-git-main-surfaces-platform.vercel.app");
  });

  it("defaults to localhost for local builds", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
});
