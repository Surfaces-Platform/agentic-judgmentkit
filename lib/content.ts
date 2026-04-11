import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import {
  CHANGELOG_DIR,
  DOCS_DIR,
  RESOURCES_DIR,
  SCHEMAS_DIR,
} from "@/lib/constants";
import { extractHeadings } from "@/lib/markdown";
import type {
  ChangelogEntry,
  DocPage,
  ResourceIndex,
} from "@/lib/types";
import { docFrontmatterSchema } from "@/lib/validation";
import { walkFiles } from "@/lib/utils";

export async function loadDocPages() {
  const files = await walkFiles(DOCS_DIR, ".mdx");
  const pages = await Promise.all(
    files.map(async (filePath) => {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = matter(raw);
      const frontmatter = docFrontmatterSchema.parse(parsed.data);
      const body = parsed.content.trim();
      const headings = extractHeadings(body);

      return {
        filePath,
        slug: frontmatter.slug,
        markdownPath: `${frontmatter.slug}.md`,
        frontmatter,
        body,
        headings,
      } satisfies DocPage;
    }),
  );

  return pages.sort((left, right) => left.slug.localeCompare(right.slug));
}

export async function loadResources() {
  const files = await walkFiles(RESOURCES_DIR, ".json");
  return Promise.all(
    files.map(async (filePath) => {
      const raw = await fs.readFile(filePath, "utf8");
      return {
        filePath,
        data: JSON.parse(raw) as Record<string, unknown>,
        raw,
      };
    }),
  );
}

export async function loadSchemas() {
  const files = await walkFiles(SCHEMAS_DIR, ".json");
  return Promise.all(
    files.map(async (filePath) => {
      const raw = await fs.readFile(filePath, "utf8");
      return {
        filePath,
        data: JSON.parse(raw) as Record<string, unknown>,
        raw,
      };
    }),
  );
}

export async function loadChangelogEntries() {
  const files = await walkFiles(CHANGELOG_DIR, ".json");
  const entries = await Promise.all(
    files.map(async (filePath) => {
      const raw = await fs.readFile(filePath, "utf8");
      return JSON.parse(raw) as ChangelogEntry;
    }),
  );

  return entries.sort((left, right) =>
    right.published_at.localeCompare(left.published_at),
  );
}

export async function loadGeneratedResourceIndex() {
  const raw = await fs.readFile(path.join("public", "resources", "index.json"), "utf8");
  return JSON.parse(raw) as ResourceIndex;
}
