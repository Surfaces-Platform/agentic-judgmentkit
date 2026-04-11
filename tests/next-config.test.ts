import { describe, expect, it } from "vitest";

describe("next config redirects", () => {
  it("redirects legacy public hosts to the canonical ai domain", async () => {
    const nextConfigModule = await import("../next.config.mjs");
    const nextConfig = nextConfigModule.default;
    const redirects = await nextConfig.redirects();

    expect(redirects).toEqual([
      {
        source: "/:path*",
        has: [{ type: "host", value: "judgmentkit.com" }],
        destination: "https://judgmentkit.ai/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.judgmentkit.com" }],
        destination: "https://judgmentkit.ai/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "judgmentkit.design" }],
        destination: "https://judgmentkit.ai/:path*",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.judgmentkit.design" }],
        destination: "https://judgmentkit.ai/:path*",
        permanent: true,
      },
    ]);
  });
});
