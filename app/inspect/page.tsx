import { InspectSurface } from "@/components/inspect-surface";
import { loadProductSurface } from "@/lib/product-surface";

export default function InspectPage() {
  const content = loadProductSurface();

  return <InspectSurface content={content} />;
}
