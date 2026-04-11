import { headers } from "next/headers";

import { LandingPage } from "@/components/landing-page";
import { loadLandingPage } from "@/lib/landing-page";
import { getRequestOrigin } from "@/lib/request-origin";

export default async function HomePage() {
  const origin = getRequestOrigin(await headers());
  const content = await loadLandingPage(`${origin}/mcp`);

  return <LandingPage content={content} />;
}
