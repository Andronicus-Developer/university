import type { Metadata } from "next";
import { ErudianLandingPage } from "@/components/landing/ErudianLandingPage";
import { getCachedLandingPageContent } from "@/lib/landing/landing-content-service";
import {
  buildLandingJsonLd,
  buildPublicSiteMetadata,
} from "@/lib/seo/seo-config";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getCachedLandingPageContent();
  const siteMeta = buildPublicSiteMetadata(content);
  return {
    ...siteMeta,
    alternates: {
      canonical: "/",
    },
  };
}

export default async function Home() {
  const initialContent = await getCachedLandingPageContent();
  const jsonLd = buildLandingJsonLd(initialContent);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ErudianLandingPage initialContent={initialContent} />
    </>
  );
}
