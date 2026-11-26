import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/seo/seo-config";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: [
        "/super-admin/",
        "/superadmin/",
        "/admin/",
        "/teacher/",
        "/lecturer/",
        "/student/",
        "/parent/",
        "/finance/",
        "/bursar/",
        "/registrar/",
        "/applicant/",
        "/advisor/",
        "/api/",
        "/unauthorized",
        "/portal-unavailable",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
