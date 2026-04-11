import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export async function walkFiles(
  directory: string,
  extension?: string,
): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(entryPath, extension);
      }
      if (!extension || entry.name.endsWith(extension)) {
        return [entryPath];
      }
      return [];
    }),
  );

  return nested.flat().sort();
}

export async function ensureDirectory(directory: string) {
  await fs.mkdir(directory, { recursive: true });
}

export async function resetDirectory(directory: string) {
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
}

export function toSlugId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sha256(input: string) {
  return `sha256:${crypto.createHash("sha256").update(input).digest("hex")}`;
}

export function unique<T>(items: T[]) {
  return [...new Set(items)];
}

export function sortByKey<T>(items: T[], getter: (item: T) => string) {
  return [...items].sort((left, right) => getter(left).localeCompare(getter(right)));
}

export function absoluteUrl(url: string) {
  return url.startsWith("http") ? url : `https://judgmentkit.com${url}`;
}
