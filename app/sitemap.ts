import type { MetadataRoute } from "next";

import { ROOT_URL } from "@/lib/constants";
import { loadDocPages } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await loadDocPages();

  return [
    {
      url: ROOT_URL,
      lastModified: new Date(),
    },
    {
      url: `${ROOT_URL}/changelog`,
      lastModified: new Date(),
    },
    {
      url: `${ROOT_URL}/inspect`,
      lastModified: new Date(),
    },
    ...pages.map((page) => ({
      url: `${ROOT_URL}${page.slug}`,
      lastModified: new Date(page.frontmatter.last_reviewed),
    })),
  ];
}
