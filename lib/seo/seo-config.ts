import type { Metadata } from "next";
import {
  DEFAULT_LANDING_PAGE_CONTENT,
  type LandingPageContent,
} from "@/lib/landing/default-content";

const DEFAULT_FALLBACK_APP_URL = "https://erudian360.com";

export const PRIVATE_PORTAL_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
    "max-snippet": 0,
  },
};

export function getAppBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    DEFAULT_FALLBACK_APP_URL,
  ];

  for (const raw of candidates) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) continue;
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    try {
      const url = new URL(withProtocol);
      return url.origin;
    } catch {
      continue;
    }
  }

  return DEFAULT_FALLBACK_APP_URL;
}

function toAbsoluteUrl(urlOrPath: string | undefined | null, baseUrl: string): string | undefined {
  const raw = String(urlOrPath || "").trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${baseUrl}${raw}`;
  return `${baseUrl}/${raw}`;
}

export function buildPrivatePortalMetadata(portalTitle: string): Metadata {
  return {
    title: portalTitle,
    description: `Authenticated workspace — ${portalTitle}`,
    robots: PRIVATE_PORTAL_ROBOTS,
  };
}

export function buildPublicSiteMetadata(content: LandingPageContent): Metadata {
  const baseUrl = getAppBaseUrl();
  const seo = content?.seo || DEFAULT_LANDING_PAGE_CONTENT.seo;

  const siteName =
    seo.siteName?.trim() ||
    `${content?.navbar?.brandPrimary || "Erudian"}${content?.navbar?.brandAccent || "360"}`;
  const metaTitle =
    seo.metaTitle?.trim() || DEFAULT_LANDING_PAGE_CONTENT.seo.metaTitle;
  const metaDescription =
    seo.metaDescription?.trim() || DEFAULT_LANDING_PAGE_CONTENT.seo.metaDescription;
  const keywords =
    Array.isArray(seo.keywords) && seo.keywords.length > 0
      ? seo.keywords.map((k) => String(k).trim()).filter(Boolean)
      : DEFAULT_LANDING_PAGE_CONTENT.seo.keywords;

  const ogTitle = seo.ogTitle?.trim() || metaTitle;
  const ogDescription = seo.ogDescription?.trim() || metaDescription;
  const ogImageUrl =
    toAbsoluteUrl(seo.ogImageUrl, baseUrl) || `${baseUrl}/opengraph-image`;

  const twitterHandle = seo.twitterHandle?.trim();
  const normalizedTwitterHandle = twitterHandle
    ? twitterHandle.startsWith("@")
      ? twitterHandle
      : `@${twitterHandle}`
    : undefined;

  const googleVerification = seo.googleSiteVerification?.trim();
  const bingVerification = seo.bingSiteVerification?.trim();

  const verification: Metadata["verification"] =
    googleVerification || bingVerification
      ? {
          ...(googleVerification ? { google: googleVerification } : {}),
          ...(bingVerification
            ? { other: { "msvalidate.01": bingVerification } }
            : {}),
        }
      : undefined;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: metaTitle,
      template: `%s | ${siteName}`,
    },
    description: metaDescription,
    keywords,
    applicationName: siteName,
    authors: [{ name: siteName, url: baseUrl }],
    creator: siteName,
    publisher: siteName,
    category: "Education Technology",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: baseUrl,
      siteName,
      title: ogTitle,
      description: ogDescription,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${siteName} — Smart Multi-Tenant School Management Platform`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImageUrl],
      ...(normalizedTwitterHandle
        ? { site: normalizedTwitterHandle, creator: normalizedTwitterHandle }
        : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    ...(verification ? { verification } : {}),
  };
}

function parseNumericPrice(rawPrice: string): number | null {
  const cleaned = String(rawPrice || "").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function buildLandingJsonLd(content: LandingPageContent) {
  const baseUrl = getAppBaseUrl();
  const seo = content?.seo || DEFAULT_LANDING_PAGE_CONTENT.seo;
  const footer = content?.footer || DEFAULT_LANDING_PAGE_CONTENT.footer;
  const siteName =
    seo.siteName?.trim() ||
    `${content?.navbar?.brandPrimary || "Erudian"}${content?.navbar?.brandAccent || "360"}`;
  const description =
    seo.metaDescription?.trim() || DEFAULT_LANDING_PAGE_CONTENT.seo.metaDescription;
  const ogImage =
    toAbsoluteUrl(seo.ogImageUrl, baseUrl) || `${baseUrl}/opengraph-image`;
  const logoUrl =
    toAbsoluteUrl(seo.organizationLogoUrl || content?.navbar?.logoUrl, baseUrl) ||
    `${baseUrl}/apple-icon`;

  const socialLinks = Array.isArray(seo.socialLinks)
    ? seo.socialLinks.map((u) => String(u || "").trim()).filter(Boolean)
    : [];

  const featureList = [
    ...(content?.features?.items || []).map((f) => f.title),
    ...(content?.school_types?.items || []).map((s) => s.title),
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  const pricingTiers = content?.pricing?.tiers || [];
  const offers = pricingTiers.map((tier) => {
    const rawPrice = tier.customPriceLabel?.trim() || tier.annualPrice || tier.monthlyPrice;
    const numeric = parseNumericPrice(rawPrice);
    if (numeric === null) {
      return {
        "@type": "Offer",
        name: tier.name,
        description: tier.description,
        priceCurrency: "USD",
        availability: "https://schema.org/OnlineOnly",
        url: `${baseUrl}/#pricing`,
      };
    }
    return {
      "@type": "Offer",
      name: tier.name,
      description: tier.description,
      price: numeric,
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: numeric,
        priceCurrency: "USD",
        unitText: "MONTH",
      },
      availability: "https://schema.org/InStock",
      url: `${baseUrl}/#pricing`,
    };
  });

  const testimonialsCount = Array.isArray(content?.testimonials?.items)
    ? content.testimonials.items.length
    : 0;

  const organizationNode: Record<string, any> = {
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: siteName,
    url: baseUrl,
    logo: {
      "@type": "ImageObject",
      url: logoUrl,
    },
    description: footer.description || description,
    ...(footer.email ? { email: footer.email } : {}),
    ...(footer.phone ? { telephone: footer.phone } : {}),
    ...(footer.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: footer.address,
          },
        }
      : {}),
    ...(footer.email || footer.phone
      ? {
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "sales",
              ...(footer.email ? { email: footer.email } : {}),
              ...(footer.phone ? { telephone: footer.phone } : {}),
              areaServed: "Africa",
              availableLanguage: ["English"],
            },
          ],
        }
      : {}),
    ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
  };

  const softwareApplicationNode: Record<string, any> = {
    "@type": "SoftwareApplication",
    "@id": `${baseUrl}/#software`,
    name: siteName,
    applicationCategory: "EducationalApplication",
    applicationSubCategory: "Multi-Tenant School Management SaaS",
    operatingSystem: "Web, iOS, Android",
    url: baseUrl,
    image: ogImage,
    description,
    publisher: { "@id": `${baseUrl}/#organization` },
    areaServed: {
      "@type": "Continent",
      name: "Africa",
    },
    audience: {
      "@type": "EducationalAudience",
      educationalRole: [
        "Universities",
        "High Schools",
        "Vocational & Technical Institutions",
      ],
    },
    ...(featureList.length > 0 ? { featureList } : {}),
    ...(offers.length > 0 ? { offers } : {}),
    ...(testimonialsCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "5.0",
            bestRating: "5",
            ratingCount: testimonialsCount,
          },
        }
      : {}),
  };

  const faqItems =
    content?.visibility?.faq !== false && Array.isArray(content?.faq?.items)
      ? content.faq.items.filter((item) => item?.question?.trim() && item?.answer?.trim())
      : [];

  const graph: Record<string, any>[] = [organizationNode, softwareApplicationNode];

  if (faqItems.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${baseUrl}/#faq`,
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question.trim(),
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer.trim(),
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
