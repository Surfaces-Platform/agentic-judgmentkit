import { z } from "zod";

import rawLandingPage from "@/content/landing-page.json";
import { loadProductSurface } from "@/lib/product-surface";
import type { LandingPageContent } from "@/lib/types";

const landingPageSchema = z.object({
  product_name: z.string(),
  eyebrow: z.string(),
  headline: z.string(),
  subhead: z.string(),
});

export function loadLandingPage(): LandingPageContent {
  const content = landingPageSchema.parse(rawLandingPage);
  const productSurface = loadProductSurface();

  return {
    ...content,
    install_prompt: productSurface.install_prompt,
    verify_prompt: productSurface.verify_prompt,
    inspect: productSurface.inspect,
  };
}
