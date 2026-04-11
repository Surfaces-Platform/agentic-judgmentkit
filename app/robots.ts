import type { MetadataRoute } from "next";

import { ROOT_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${ROOT_URL}/sitemap.xml`,
  };
}
