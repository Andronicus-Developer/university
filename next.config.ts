import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    agentUpgrade: false,
    optimizePackageImports: [
      "lucide-react",
      "@supabase/supabase-js",
      "zod",
      "react-hook-form",
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const privateNoIndexHeader = [
      {
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive",
      },
    ];
    const privateRouteSources = [
      "/super-admin/:path*",
      "/superadmin/:path*",
      "/admin/:path*",
      "/teacher/:path*",
      "/lecturer/:path*",
      "/student/:path*",
      "/parent/:path*",
      "/finance/:path*",
      "/bursar/:path*",
      "/registrar/:path*",
      "/applicant/:path*",
      "/advisor/:path*",
      "/api/:path*",
      "/unauthorized",
      "/portal-unavailable",
    ];

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      ...privateRouteSources.map((source) => ({
        source,
        headers: privateNoIndexHeader,
      })),
    ];
  },
};

export default nextConfig;
