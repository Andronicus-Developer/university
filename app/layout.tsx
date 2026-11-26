import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { getCachedLandingPageContent } from "@/lib/landing/landing-content-service";
import { buildPublicSiteMetadata } from "@/lib/seo/seo-config";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const content = await getCachedLandingPageContent();
  return buildPublicSiteMetadata(content);
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full font-sans bg-[#F8FAFC] text-[#0F172A] dark:bg-[#0B0F19] dark:text-slate-100 transition-colors"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
