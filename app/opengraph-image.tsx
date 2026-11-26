import { ImageResponse } from "next/og";
import { getCachedLandingPageContent } from "@/lib/landing/landing-content-service";

export const alt = "Erudian360 — Smart Multi-Tenant School Management SaaS Platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const content = await getCachedLandingPageContent();
  const brandPrimary = content?.navbar?.brandPrimary || "Erudian";
  const brandAccent = content?.navbar?.brandAccent || "360";
  const headline =
    [content?.hero?.headlineLine1, content?.hero?.headlineLine2]
      .filter(Boolean)
      .join(" ") || "Smart School Management for Every Student";
  const subtitle =
    content?.seo?.ogDescription?.trim() ||
    content?.seo?.metaDescription?.trim() ||
    "All-in-one multi-tenant SaaS for African universities, high schools, and vocational institutions.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 68px",
          background:
            "linear-gradient(135deg, #0E0D1B 0%, #1E1348 52%, #4C1D95 100%)",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top Brand Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                <path
                  d="M17.35 5.45C18.53 3.42 21.47 3.42 22.65 5.45L35.42 27.55C36.6 29.58 35.13 32.12 32.78 32.12H7.22C4.87 32.12 3.4 29.58 4.58 27.55L17.35 5.45Z"
                  fill="#FFFFFF"
                />
                <path d="M20 12.2L27.5 25.8H12.5L20 12.2Z" fill="#7C3AED" />
              </svg>
            </div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 800 }}>
              <span style={{ color: "#C4B5FD" }}>{brandPrimary}</span>
              <span style={{ color: "#FFFFFF" }}>{brandAccent}</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.22)",
              fontSize: 18,
              fontWeight: 600,
              color: "#E9D5FF",
            }}
          >
            Pan-African Multi-Tenant School SaaS
          </div>
        </div>

        {/* Center Value Proposition */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 960,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: 24,
              lineHeight: 1.45,
              color: "#DDD6FE",
            }}
          >
            {subtitle.slice(0, 175)}
          </div>
        </div>

        {/* Bottom Portal Badges */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            {["Universities", "High Schools", "Vocational Centers"].map((pill) => (
              <div
                key={pill}
                style={{
                  display: "flex",
                  padding: "8px 18px",
                  borderRadius: 999,
                  background: "rgba(167, 139, 250, 0.16)",
                  border: "1px solid rgba(196, 181, 253, 0.35)",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#F3E8FF",
                }}
              >
                {pill}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#C4B5FD" }}>
            Admissions • Attendance • Exams • Bursar
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
