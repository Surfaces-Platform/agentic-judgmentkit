import { ReferenceSurface } from "@/components/reference-surface";
import { loadProductSurface } from "@/lib/product-surface";

export default function ReferencePage() {
  const content = loadProductSurface();

  return <ReferenceSurface content={content} />;
}
