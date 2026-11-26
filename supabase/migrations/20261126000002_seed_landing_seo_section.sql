-- ============================================================================
-- Migration: 20261126000002_seed_landing_seo_section.sql
-- Purpose:
--   Idempotently seed the `seo` section row inside `public.landing_page_content`
--   so Super Admins can customize Meta Title, Description, Focus Keywords,
--   Open Graph images, and Google/Bing verification tags without touching
--   existing landing page content rows.
-- ============================================================================

INSERT INTO public.landing_page_content (section_key, content, is_visible)
VALUES (
  'seo',
  $json${
    "siteName": "Erudian360",
    "metaTitle": "Erudian360 — Smart Multi-Tenant School Management SaaS Platform",
    "metaDescription": "All-in-one multi-tenant school management SaaS for African universities, high schools, and vocational institutions. Unify admissions, attendance, exams, fees, and campus governance.",
    "keywords": [
      "school management system Africa",
      "multi-tenant school ERP",
      "university management software",
      "high school management SaaS",
      "vocational school software",
      "student portal software",
      "school fee management system",
      "academic transcript software",
      "Erudian360"
    ],
    "ogTitle": "",
    "ogDescription": "",
    "ogImageUrl": "",
    "twitterHandle": "",
    "googleSiteVerification": "",
    "bingSiteVerification": "",
    "organizationLogoUrl": "",
    "socialLinks": []
  }$json$::jsonb,
  true
)
ON CONFLICT (section_key) DO NOTHING;
