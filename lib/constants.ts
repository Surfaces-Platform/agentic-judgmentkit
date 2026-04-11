import path from "node:path";

export const ROOT_URL = "https://judgmentkit.com";
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
