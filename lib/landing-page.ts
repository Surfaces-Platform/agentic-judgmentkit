import { z } from "zod";

import rawLandingPage from "@/content/landing-page.json";
import { loadProductSurface } from "@/lib/product-surface";
import type { LandingPageContent } from "@/lib/types";

const INSTALL_CLIENT_TOKEN = "<codex|claude|cursor>";

const landingPageSchema = z.object({
  product_name: z.string(),
  eyebrow: z.string(),
  headline: z.string(),
  subhead: z.string(),
});

export function loadLandingPage(): LandingPageContent {
  const content = landingPageSchema.parse(rawLandingPage);
  const productSurface = loadProductSurface();
  const install_options = productSurface.install_targets.map((target) => ({
    id: target.id,
    label: target.label,
    command: productSurface.install_command.replace(INSTALL_CLIENT_TOKEN, target.id),
  }));

  return {
    ...content,
    install_options,
    install_command: productSurface.install_command,
    verify_prompt: productSurface.verify_prompt,
    inspect: productSurface.inspect,
  };
}
