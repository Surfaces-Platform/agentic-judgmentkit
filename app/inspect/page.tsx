import { headers } from "next/headers";

import { InspectSurface } from "@/components/inspect-surface";
import { loadProductSurface } from "@/lib/product-surface";
import { getRequestOrigin } from "@/lib/request-origin";

export default async function InspectPage() {
  const origin = getRequestOrigin(await headers());
  const content = loadProductSurface(`${origin}/mcp`);

  return <InspectSurface content={content} />;
}
