import type { MetadataRoute } from "next";
import { getCachedLandingPageMeta } from "@/lib/landing/landing-content-service";
import { getAppBaseUrl } from "@/lib/seo/seo-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppBaseUrl();
  const { lastModified } = await getCachedLandingPageMeta();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
