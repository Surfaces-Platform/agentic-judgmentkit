import { redirect } from "next/navigation";

import { resolveLegacyDocsRedirect } from "@/lib/docs-compat";

type LegacyDocsPageProps = {
  params: Promise<{
    slug: string[];
  }>;
};

export default async function LegacyDocsPage({ params }: LegacyDocsPageProps) {
  const resolved = await params;
  const slug = `/docs/${resolved.slug.join("/")}`;

  redirect(await resolveLegacyDocsRedirect(slug));
}
