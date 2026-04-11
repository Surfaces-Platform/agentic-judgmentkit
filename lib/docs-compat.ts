import { ROOT_URL } from "@/lib/constants";
import { loadResources } from "@/lib/content";

const INSPECT_PATH = "/inspect";
let legacyDocsRedirectMapPromise: Promise<Map<string, string>> | undefined;

async function loadLegacyDocsRedirectMap() {
  if (!legacyDocsRedirectMapPromise) {
    legacyDocsRedirectMapPromise = loadResources().then((resources) => {
      const redirects = new Map<string, string>();

      for (const resource of resources) {
        const links = (resource.data.links ?? {}) as Record<string, unknown>;
        const docsUrl = typeof links.docs_url === "string" ? links.docs_url : "";
        if (!docsUrl) {
          continue;
        }

        const pathname = docsUrl.startsWith(ROOT_URL)
          ? docsUrl.replace(ROOT_URL, "")
          : docsUrl;
        redirects.set(pathname, `${INSPECT_PATH}#resource-${String(resource.data.id)}`);
      }

      return redirects;
    });
  }

  return legacyDocsRedirectMapPromise;
}

export async function resolveLegacyDocsRedirect(slug: string) {
  if (!slug.startsWith("/docs/")) {
    return INSPECT_PATH;
  }

  const redirects = await loadLegacyDocsRedirectMap();
  return redirects.get(slug) ?? INSPECT_PATH;
}
