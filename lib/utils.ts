import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { ROOT_URL } from "@/lib/constants";

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

const JUDGMENTKIT_SITE_HOSTS = new Set([
  "judgmentkit.ai",
  "www.judgmentkit.ai",
  "judgmentkit.com",
  "www.judgmentkit.com",
  "judgmentkit.design",
  "www.judgmentkit.design",
]);

function isKnownSiteUrl(url: URL, siteUrl: string) {
  return (
    JUDGMENTKIT_SITE_HOSTS.has(url.host.toLowerCase()) ||
    url.host.toLowerCase() === new URL(siteUrl).host.toLowerCase()
  );
}

function tryParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function absoluteUrl(url: string, siteUrl = ROOT_URL) {
  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    const parsed = tryParseUrl(url);
    if (parsed && isKnownSiteUrl(parsed, siteUrl)) {
      return `${siteUrl}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return url;
  }

  return `${siteUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

export function stripSiteOrigin(url: string, siteUrl = ROOT_URL) {
  if (!/^https?:\/\//i.test(url)) {
    return url;
  }

  const parsed = tryParseUrl(url);
  if (!parsed || !isKnownSiteUrl(parsed, siteUrl)) {
    return url;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function rewriteInternalSiteUrls<T>(value: T, siteUrl = ROOT_URL): T {
  if (typeof value === "string") {
    return (/^https?:\/\//i.test(value)
      ? absoluteUrl(value, siteUrl)
      : value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => rewriteInternalSiteUrls(entry, siteUrl)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        rewriteInternalSiteUrls(entry, siteUrl),
      ]),
    ) as T;
  }

  return value;
}
