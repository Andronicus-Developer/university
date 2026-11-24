import { ErudianLandingPage } from "@/components/landing/ErudianLandingPage";
import { getCachedLandingPageContent } from "@/lib/landing/landing-content-service";

export default async function Home() {
  const initialContent = await getCachedLandingPageContent();
  return <ErudianLandingPage initialContent={initialContent} />;
}
