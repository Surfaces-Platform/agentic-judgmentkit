import { LandingPage } from "@/components/landing-page";
import { loadLandingPage } from "@/lib/landing-page";

export default function HomePage() {
  const content = loadLandingPage();

  return <LandingPage content={content} />;
}
