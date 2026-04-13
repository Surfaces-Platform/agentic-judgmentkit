import path from "node:path";

export const CANONICAL_SITE_URL = "https://judgmentkit.ai";
export const CANONICAL_INSTALL_URL = `${CANONICAL_SITE_URL}/install`;
export const CANONICAL_INSTALL_BOOTSTRAP_URL = `${CANONICAL_INSTALL_URL}/bootstrap`;
export const HOSTED_MCP_REFERENCE_URL = `${CANONICAL_SITE_URL}/mcp`;
export const DEFAULT_LOCAL_SITE_URL = "http://localhost:3000";
export const JUDGMENTKIT_REPOSITORY_CLONE_URL =
  "https://github.com/Surfaces-Platform/agentic-judgmentkit.git";
export const DEFAULT_LOCAL_JUDGMENTKIT_CHECKOUT_PATH = "$HOME/judgmentkit";
export const LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER =
  "<ABSOLUTE_PATH_TO_LOCAL_JUDGMENTKIT_CHECKOUT>";
export const LOCAL_JUDGMENTKIT_INSTALL_COMMAND = `npm --prefix ${LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER} install`;
export const LOCAL_JUDGMENTKIT_STDIO_ARGS = [
  "--prefix",
  LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER,
  "run",
  "mcp:stdio",
];
export const LOCAL_JUDGMENTKIT_STDIO_COMMAND = `npm --prefix ${LOCAL_JUDGMENTKIT_CHECKOUT_PLACEHOLDER} run mcp:stdio`;
export const LOCAL_JUDGMENTKIT_INSTALLER_COMMAND =
  "node --import tsx ./scripts/install-mcp.ts";
export const HOSTED_JUDGMENTKIT_BOOTSTRAP_COMMAND = `curl -fsSL ${CANONICAL_INSTALL_BOOTSTRAP_URL} | bash -s -- --client <codex|claude|cursor>`;

function normalizeSiteUrl(value: string) {
  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return new URL(withProtocol).origin;
}

export function resolveSiteUrl(env: NodeJS.ProcessEnv = process.env) {
  const explicitUrl = env.JUDGMENTKIT_SITE_URL;
  if (explicitUrl?.trim()) {
    return normalizeSiteUrl(explicitUrl);
  }

  const productionHost =
    env.VERCEL_PROJECT_PRODUCTION_URL ??
    (env.VERCEL_ENV === "production" ? env.VERCEL_URL : undefined);
  if (productionHost?.trim()) {
    return normalizeSiteUrl(productionHost);
  }

  const previewHost = env.VERCEL_BRANCH_URL ?? env.VERCEL_URL;
  if (previewHost?.trim()) {
    return normalizeSiteUrl(previewHost);
  }

  return DEFAULT_LOCAL_SITE_URL;
}

export const ROOT_URL = resolveSiteUrl();
export const CONTENT_DIR = path.join(process.cwd(), "content");
export const DOCS_DIR = path.join(CONTENT_DIR, "docs");
export const RESOURCES_DIR = path.join(CONTENT_DIR, "resources");
export const SCHEMAS_DIR = path.join(CONTENT_DIR, "schemas");
export const CHANGELOG_DIR = path.join(CONTENT_DIR, "changelog");
export const PUBLIC_DIR = path.join(process.cwd(), "public");
export const PUBLIC_DOCS_DIR = path.join(PUBLIC_DIR, "docs");
export const PUBLIC_RESOURCES_DIR = path.join(PUBLIC_DIR, "resources");
export const PUBLIC_SCHEMAS_DIR = path.join(PUBLIC_DIR, "schemas");
export const PUBLIC_SEARCH_PATH = path.join(PUBLIC_DIR, "search-index.json");
export const PUBLIC_GRAPH_PATH = path.join(PUBLIC_DIR, "graph.json");
export const PUBLIC_RESOURCE_INDEX_PATH = path.join(
  PUBLIC_DIR,
  "resources",
  "index.json",
);
export const PUBLIC_CHANGELOG_PATH = path.join(PUBLIC_DIR, "changelog.json");
export const PUBLIC_LLMS_PATH = path.join(PUBLIC_DIR, "llms.txt");
export const PUBLIC_MCP_INVENTORY_PATH = path.join(
  PUBLIC_DIR,
  "mcp-inventory.json",
);
