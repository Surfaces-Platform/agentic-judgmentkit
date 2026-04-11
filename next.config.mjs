const CANONICAL_SITE_URL = "https://judgmentkit.ai";
const LEGACY_REDIRECT_HOSTS = [
  "judgmentkit.com",
  "www.judgmentkit.com",
  "judgmentkit.design",
  "www.judgmentkit.design",
];

function normalizeSiteUrl(value) {
  return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).origin;
}

const redirectTargetUrl = normalizeSiteUrl(
  process.env.JUDGMENTKIT_SITE_URL || CANONICAL_SITE_URL,
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx"],
  async redirects() {
    return LEGACY_REDIRECT_HOSTS.map((host) => ({
      source: "/:path*",
      has: [
        {
          type: "host",
          value: host,
        },
      ],
      destination: `${redirectTargetUrl}/:path*`,
      permanent: true,
    }));
  },
};

export default nextConfig;
