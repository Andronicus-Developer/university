"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  GraduationCap,
  Hammer,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  Phone,
  School,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { ErudianLogo } from "@/components/brand/ErudianLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const RequestDemoModal = dynamic(
  () =>
    import("@/components/landing/RequestDemoModal").then(
      (m) => m.RequestDemoModal
    ),
  { ssr: false }
);

const ChatWithSalesModal = dynamic(
  () =>
    import("@/components/landing/ChatWithSalesModal").then(
      (m) => m.ChatWithSalesModal
    ),
  { ssr: false }
);
import {
  DEFAULT_LANDING_PAGE_CONTENT,
  type FeatureCardItem,
  type FeatureIconKey,
  type FooterActionLink,
  type LandingPageContent,
  type ResultsHighlightItem,
  type SchoolTypeShowcaseItem,
  type TestimonialItem,
} from "@/lib/landing/default-content";

interface ErudianLandingPageProps {
  initialContent?: LandingPageContent;
}

const FEATURE_ICON_MAP: Record<
  FeatureIconKey,
  React.ComponentType<{ className?: string }>
> = {
  users: Users,
  chart: BarChart3,
  "credit-card": CreditCard,
  "user-check": UserCheck,
  "message-square": MessageSquare,
  "graduation-cap": GraduationCap,
  calendar: Calendar,
  "book-open": BookOpen,
  award: Award,
  sparkles: Sparkles,
};

const RESULT_ICON_MAP: Record<
  ResultsHighlightItem["icon"],
  React.ComponentType<{ className?: string }>
> = {
  "check-circle": CheckCircle2,
  "trending-up": TrendingUp,
  award: Award,
};

function SourceBadge({ source }: { source: TestimonialItem["source"] }) {
  if (source === "Trustpilot") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
        <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
        Trustpilot
      </span>
    );
  }
  if (source === "G2") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
        <span className="h-3.5 w-3.5 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center font-extrabold">
          G
        </span>
        G2
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-400">
      <span className="h-2.5 w-2.5 rotate-45 bg-sky-500 inline-block" />
      Capterra
    </span>
  );
}

function TestimonialCard({ item }: { item: TestimonialItem }) {
  return (
    <div className="h-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 shadow-2xs hover:shadow-md hover:border-purple-200/80 dark:hover:border-purple-700/70 transition-all flex flex-col justify-between gap-5">
      <div className="space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              className={`h-10 w-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                item.avatarBg || "bg-purple-100 text-purple-700"
              }`}
            >
              {item.initials}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {item.name}
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {item.role}
              </div>
            </div>
          </div>
          <SourceBadge source={item.source} />
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          &ldquo;{item.quote}&rdquo;
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
            />
          ))}
        </div>
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          5.0
        </span>
      </div>
    </div>
  );
}

function FeatureBentoCard({
  item,
  onOpenDemo,
}: {
  item: FeatureCardItem;
  onOpenDemo: (mod?: string) => void;
}) {
  const Icon = FEATURE_ICON_MAP[item.icon] || Sparkles;
  return (
    <div className="flex-1 rounded-3xl bg-[#F7F7FA] dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 p-6 flex flex-col justify-between gap-5 hover:border-purple-200 dark:hover:border-purple-700/70 transition-colors">
      <div className="space-y-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#9353FF] to-[#7C3AED] text-white flex items-center justify-center shadow-sm shadow-purple-500/20">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {item.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {item.description}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onOpenDemo(item.demoModule || item.title)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7C3AED] dark:text-[#C4B5FD] hover:text-[#6D28D9] dark:hover:text-white cursor-pointer w-fit transition-colors"
      >
        <span>Learn More</span>
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SchoolTypeCard({
  item,
  onExplore,
}: {
  item: SchoolTypeShowcaseItem;
  onExplore: (mod: string) => void;
}) {
  const styles =
    item.typeKey === "vocational"
      ? {
          icon: Hammer,
          iconBg: "from-amber-500 to-orange-600 shadow-amber-500/20",
          badge:
            "bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-800/70 text-amber-700 dark:text-amber-300",
          check: "text-amber-600 dark:text-amber-400",
        }
      : item.typeKey === "high_school"
      ? {
          icon: School,
          iconBg: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
          badge:
            "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300",
          check: "text-emerald-600 dark:text-emerald-400",
        }
      : {
          icon: GraduationCap,
          iconBg: "from-[#9353FF] to-[#7C3AED] shadow-purple-500/20",
          badge:
            "bg-purple-50 dark:bg-purple-950/60 border-purple-200/80 dark:border-purple-800/70 text-[#7C3AED] dark:text-[#C4B5FD]",
          check: "text-[#7C3AED] dark:text-[#C4B5FD]",
        };

  const Icon = styles.icon;

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-7 flex flex-col justify-between gap-6 shadow-2xs hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-700/70 transition-all">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${styles.iconBg} text-white flex items-center justify-center shadow-md`}
          >
            <Icon className="h-5 w-5" />
          </div>
          {item.badge && (
            <span
              className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${styles.badge}`}
            >
              {item.badge}
            </span>
          )}
        </div>

        <div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {item.title}
          </h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {item.description}
          </p>
        </div>

        {Array.isArray(item.bullets) && item.bullets.length > 0 && (
          <ul className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            {item.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2
                  className={`h-4 w-4 shrink-0 mt-0.5 ${styles.check}`}
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => onExplore(item.title)}
        className="w-full py-2.5 px-4 rounded-full bg-[#F7F7FA] dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/60 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <span>{item.ctaLabel || "Request Demo"}</span>
        <ArrowRight className="h-3.5 w-3.5 text-[#7C3AED] dark:text-[#C4B5FD]" />
      </button>
    </div>
  );
}

/**
 * Reusable Erudian360 home dashboard phone screen shown in Hero & Bottom CTA.
 */
function CenterPhoneScreen({
  compact = false,
  onOpenDemo,
}: {
  compact?: boolean;
  onOpenDemo?: () => void;
}) {
  return (
    <div
      data-keep-light="true"
      className="relative bg-[#14141B] rounded-t-[36px] p-2.5 pb-0 shadow-2xl border border-slate-800/80"
    >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-20" />
      <div className="bg-[#FAFAFD] rounded-t-[28px] pt-7 px-3.5 pb-4 text-left overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#C084FC] text-white text-[10px] font-bold flex items-center justify-center">
              KM
            </div>
            <div>
              <div className="text-[10.5px] font-bold text-slate-900 leading-none">
                Kwame Mensah
              </div>
              <div className="text-[8.5px] text-slate-500 mt-0.5">
                ID: ERD-2026-0418
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
              <Search className="h-3 w-3" />
            </span>
            <span className="h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
              <Bell className="h-3 w-3" />
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-[#F3E8FF] via-[#EDE9FE] to-[#DDD6FE] p-3 mb-3 border border-purple-200/70">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="text-[11px] font-extrabold text-slate-900">
                Ready to Learn?
              </div>
              <p className="text-[8.5px] text-slate-600 leading-snug max-w-[130px]">
                Track live attendance, exams, and class schedules effortlessly.
              </p>
              <button
                type="button"
                onClick={onOpenDemo}
                className="mt-1 px-2.5 py-1 rounded-full bg-[#7C3AED] text-white text-[8.5px] font-semibold cursor-pointer"
              >
                View Schedule
              </button>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/80 border border-purple-200 flex items-center justify-center shrink-0">
              <GraduationCap className="h-6 w-6 text-[#7C3AED]" />
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-800 mb-2">
            <span>Quick Access</span>
            <span className="text-[#7C3AED]">See all</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              { label: "Attendance", Icon: UserCheck, bg: "bg-purple-50 text-[#7C3AED]" },
              { label: "Timetable", Icon: Calendar, bg: "bg-blue-50 text-blue-600" },
              { label: "Results", Icon: Award, bg: "bg-amber-50 text-amber-600" },
              { label: "Fees", Icon: CreditCard, bg: "bg-emerald-50 text-emerald-600" },
            ].map(({ label, Icon, bg }) => (
              <div
                key={label}
                className="rounded-xl bg-white border border-slate-100 py-2 px-1 flex flex-col items-center gap-1"
              >
                <span className={`h-6 w-6 rounded-lg flex items-center justify-center ${bg}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <span className="text-[7.5px] font-semibold text-slate-700 truncate w-full">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {!compact && (
          <div className="rounded-xl bg-white border border-slate-100 p-2.5 flex items-center justify-between">
            <div>
              <div className="text-[9px] font-bold text-slate-900">
                Academic Overview
              </div>
              <div className="text-[8px] text-slate-500">
                Term GPA: 3.85 · 96% Attendance
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[8px] font-bold">
              Active
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ErudianLandingPage({
  initialContent = DEFAULT_LANDING_PAGE_CONTENT,
}: ErudianLandingPageProps) {
  const content = initialContent || DEFAULT_LANDING_PAGE_CONTENT;
  const visibility = content.visibility || DEFAULT_LANDING_PAGE_CONTENT.visibility;

  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoModule, setDemoModule] = useState<string | undefined>(undefined);
  const [demoPlan, setDemoPlan] = useState<string | undefined>(undefined);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [salesModalOpen, setSalesModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const openDemo = (moduleName?: string, planName?: string) => {
    setDemoModule(moduleName);
    setDemoPlan(planName);
    setDemoModalOpen(true);
    setMobileMenuOpen(false);
  };

  const openSales = () => {
    setSalesModalOpen(true);
    setMobileMenuOpen(false);
  };

  const renderFooterItem = (item: FooterActionLink, keyPrefix: string) => {
    if (item.action === "demo") {
      return (
        <li key={`${keyPrefix}-${item.label}`}>
          <button
            type="button"
            onClick={() => openDemo(item.demoModule)}
            className="hover:text-white transition-colors cursor-pointer text-left"
          >
            {item.label}
          </button>
        </li>
      );
    }
    if (item.action === "sales") {
      return (
        <li key={`${keyPrefix}-${item.label}`}>
          <button
            type="button"
            onClick={openSales}
            className="hover:text-white transition-colors cursor-pointer text-left"
          >
            {item.label}
          </button>
        </li>
      );
    }
    const href = item.href || "#home";
    const isInternalRoute = href.startsWith("/");
    return (
      <li key={`${keyPrefix}-${item.label}`}>
        {isInternalRoute ? (
          <Link href={href} className="hover:text-white transition-colors">
            {item.label}
          </Link>
        ) : (
          <a href={href} className="hover:text-white transition-colors">
            {item.label}
          </a>
        )}
      </li>
    );
  };

  const { navbar, hero, features, school_types, results_spotlight, about_stats, pricing, testimonials, faq, cta_banner, footer } =
    content;

  const featureItems = features.items || [];
  const col1Features = featureItems.slice(0, 2);
  const col2Feature = featureItems[2];
  const col3Features = featureItems.slice(3, 5);
  const extraFeatures = featureItems.slice(5);

  const proficiencyNum = Math.min(
    100,
    Math.max(
      0,
      Number.parseInt(String(results_spotlight.proficiencyValue).replace(/[^0-9]/g, ""), 10) || 95
    )
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F19] text-[#111118] dark:text-slate-100 font-sans overflow-x-clip transition-colors">
      {/* ===================================================================== */}
      {/* 1. SEAMLESS STICKY NAVBAR & FULL-BLEED BLENDED HERO                    */}
      {/* ===================================================================== */}
      {visibility.navbar && (
        <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#FAF7FF]/80 dark:bg-[#0E0D1B]/80 transition-colors">
          <div className="max-w-[1260px] mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between gap-4">
            <Link href="/" className="shrink-0 flex items-center gap-2.5" aria-label="Erudian360 Home">
              {navbar.logoUrl ? (
                <span className="inline-flex items-center gap-2.5">
                  <img
                    src={navbar.logoUrl}
                    alt={`${navbar.brandPrimary}${navbar.brandAccent}`}
                    className="h-8 w-auto max-w-[140px] object-contain"
                  />
                  {(navbar.brandPrimary || navbar.brandAccent) && (
                    <span className="text-[19px] font-extrabold tracking-tight leading-none text-[#7C3AED] dark:text-[#A78BFA]">
                      {navbar.brandPrimary}
                      <span className="text-[#0F172A] dark:text-white">
                        {navbar.brandAccent}
                      </span>
                    </span>
                  )}
                </span>
              ) : (
                <ErudianLogo
                  size="md"
                  brandPrimary={navbar.brandPrimary}
                  brandAccent={navbar.brandAccent}
                />
              )}
            </Link>

            {/* Center Translucent Pill Navigation */}
            <nav
              aria-label="Primary"
              className="hidden md:flex items-center gap-1 rounded-full bg-purple-500/[0.07] dark:bg-white/[0.06] p-1"
            >
              {(navbar.navLinks || []).map((link, idx) => (
                <a
                  key={`${link.label}-${idx}`}
                  href={link.href || "#home"}
                  className={
                    idx === 0
                      ? "px-4 py-1.5 rounded-full bg-white/95 dark:bg-slate-800/95 text-xs font-bold text-slate-900 dark:text-white shadow-2xs"
                      : "px-4 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  }
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Right Navbar Actions: Theme Toggle + Sign In + Request Demo */}
            <div className="hidden md:flex items-center gap-2.5 shrink-0">
              <ThemeToggle variant="compact" align="right" />
              <Link
                href={navbar.signInHref || "/login"}
                className="px-4 py-2 rounded-full bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/15 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:text-[#7C3AED] dark:hover:text-[#C4B5FD] transition-all"
              >
                {navbar.signInLabel || "Sign In"}
              </Link>
              <button
                type="button"
                onClick={() => openDemo()}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#9353FF] to-[#7C3AED] hover:from-[#8B5CF6] hover:to-[#6D28D9] text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all cursor-pointer active:scale-[0.98]"
              >
                {navbar.ctaLabel || "Request Demo"}
              </button>
            </div>

            {/* Mobile Actions: Compact Theme Toggle + Hamburger */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle variant="compact" align="right" />
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Toggle navigation menu"
                className="h-9 w-9 rounded-full bg-white/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mx-4 mb-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 shadow-xl space-y-3">
              <div className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                {(navbar.navLinks || []).map((link, idx) => (
                  <a
                    key={`mob-${link.label}-${idx}`}
                    href={link.href || "#home"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Theme
                </span>
                <ThemeToggle variant="segmented" />
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Link
                  href={navbar.signInHref || "/login"}
                  className="flex-1 text-center px-4 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold"
                >
                  {navbar.signInLabel || "Sign In"}
                </Link>
                <button
                  type="button"
                  onClick={() => openDemo()}
                  className="flex-1 px-4 py-2.5 rounded-full bg-[#7C3AED] text-white text-xs font-bold cursor-pointer"
                >
                  {navbar.ctaLabel || "Request Demo"}
                </button>
              </div>
            </div>
          )}
        </header>
      )}

      {visibility.hero && (
        <section
          id="home"
          className="relative w-full overflow-hidden bg-gradient-to-b from-[#FAF7FF] via-[#F2E9FF] via-55% to-white dark:from-[#0E0D1B] dark:via-[#171232] dark:to-[#0B0F19]"
        >
          <div className="relative max-w-[1260px] mx-auto px-4 sm:px-8 pt-6 sm:pt-10 pb-8 sm:pb-12">
            {/* Decorative Swirling Lavender Vortex Graphics Left & Right */}
            <svg
              viewBox="0 0 260 260"
              className="pointer-events-none hidden md:block absolute -left-16 top-16 w-64 h-64 opacity-45 dark:opacity-20"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="130" cy="130" r="95" stroke="url(#swirlL)" strokeWidth="22" strokeDasharray="70 30" />
              <circle cx="130" cy="130" r="62" stroke="#FFFFFF" strokeWidth="14" strokeOpacity="0.65" />
              <defs>
                <linearGradient id="swirlL" x1="20" y1="20" x2="220" y2="220" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#C4B5FD" stopOpacity="0.5" />
                </linearGradient>
              </defs>
            </svg>

            <svg
              viewBox="0 0 260 260"
              className="pointer-events-none hidden md:block absolute -right-16 top-16 w-64 h-64 opacity-45 dark:opacity-20"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="130" cy="130" r="95" stroke="url(#swirlR)" strokeWidth="22" strokeDasharray="70 30" />
              <circle cx="130" cy="130" r="62" stroke="#FFFFFF" strokeWidth="14" strokeOpacity="0.65" />
              <defs>
                <linearGradient id="swirlR" x1="220" y1="20" x2="20" y2="220" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#C4B5FD" stopOpacity="0.5" />
                </linearGradient>
              </defs>
            </svg>

            {/* HERO COPY & COMPOSITION */}
            <div className="relative z-10 text-center px-2 sm:px-5 pt-2 sm:pt-4 pb-8 max-w-3xl mx-auto">
              <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.08] text-[#111118] dark:text-white">
                {hero.headlineLine1}
                {hero.headlineLine2 && (
                  <>
                    <br />
                    {hero.headlineLine2}
                  </>
                )}
              </h1>
              <p className="mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
                {hero.subheading}
              </p>

              {/* Dual Hero CTAs */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => openDemo()}
                  className="px-6 py-3 rounded-full bg-[#0F0F14] dark:bg-white hover:bg-slate-800 dark:hover:bg-purple-50 text-white dark:text-[#0F0F14] text-xs sm:text-[13px] font-semibold shadow-lg shadow-slate-900/20 inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#C4B5FD] dark:text-[#7C3AED]" />
                  <span>{hero.primaryCtaLabel}</span>
                </button>

                <button
                  type="button"
                  onClick={openSales}
                  className="px-6 py-3 rounded-full bg-white/95 dark:bg-slate-900/90 hover:bg-purple-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-[13px] font-semibold shadow-sm inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-[#7C3AED] dark:text-[#C4B5FD]" />
                  <span>{hero.secondaryCtaLabel}</span>
                </button>
              </div>
            </div>

            {/* HERO 3-PHONE SHOWCASE OR CUSTOM HERO VISUAL */}
            {hero.heroImageUrl ? (
              <div className="relative z-10 max-w-4xl mx-auto px-2 sm:px-6 pt-2 pb-4">
                <div className="rounded-3xl overflow-hidden shadow-2xl bg-white/80 dark:bg-slate-900/80">
                  <img
                    src={hero.heroImageUrl}
                    alt={hero.headlineLine1}
                    className="w-full max-h-[420px] object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="relative z-10 max-w-5xl mx-auto px-2 sm:px-6 pt-2">
                <div className="relative flex items-end justify-center gap-4 lg:gap-6">
                  {/* Floating Left Alert Pills */}
                  <div className="hidden lg:flex flex-col gap-2.5 absolute left-2 top-8 z-30 w-56">
                    {(hero.alertBadges || []).map((pill, idx) => {
                      const toneClass =
                        pill.tone === "sky"
                          ? "bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-300"
                          : pill.tone === "emerald"
                          ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-300"
                          : "bg-purple-50 dark:bg-purple-950/70 text-[#7C3AED] dark:text-[#C4B5FD]";
                      return (
                        <div
                          key={`${pill.label}-${idx}`}
                          className="rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-purple-100/80 dark:border-slate-700/80 px-3.5 py-2.5 shadow-lg flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${toneClass}`}
                            >
                              ✓
                            </span>
                            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {pill.label}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                            {pill.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Left Secondary Phone: Class Schedule */}
                  <div
                    data-keep-light="true"
                    className="hidden md:block w-[225px] lg:w-[240px] -mb-2 translate-y-4"
                  >
                    <div className="bg-[#181822] rounded-t-[30px] p-2 pb-0 shadow-xl border border-slate-800/70">
                      <div className="bg-white rounded-t-[24px] p-3.5 pb-6 text-left">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-800 mb-3">
                          <span>Class Schedule</span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-[#7C3AED]">
                            Term 1
                          </span>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-semibold text-slate-400 mb-1.5">
                          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-medium text-slate-700">
                          {Array.from({ length: 21 }).map((_, idx) => {
                            const day = idx + 1;
                            const active = day === 12 || day === 16;
                            return (
                              <span
                                key={day}
                                className={`h-5 w-5 mx-auto rounded-md flex items-center justify-center ${
                                  active
                                    ? "bg-[#7C3AED] text-white font-bold"
                                    : "hover:bg-slate-100"
                                }`}
                              >
                                {day}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center Primary Front Phone */}
                  <div className="w-[275px] sm:w-[300px] lg:w-[315px] z-20">
                    <CenterPhoneScreen onOpenDemo={() => openDemo("Student Management")} />
                  </div>

                  {/* Right Secondary Phone: Student Progress */}
                  <div
                    data-keep-light="true"
                    className="hidden md:block w-[225px] lg:w-[240px] -mb-2 translate-y-4"
                  >
                    <div className="bg-[#181822] rounded-t-[30px] p-2 pb-0 shadow-xl border border-slate-800/70">
                      <div className="bg-white rounded-t-[24px] p-3.5 pb-6 text-left">
                        <div className="text-[10px] font-bold text-slate-800 mb-2">
                          Course Progress
                        </div>
                        <div className="rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] p-2.5 text-white mb-2.5">
                          <div className="text-[9px] opacity-85">Active Term</div>
                          <div className="text-xs font-extrabold">92.4% Score</div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full w-4/5 rounded-full bg-[#7C3AED]" />
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full w-3/4 rounded-full bg-emerald-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Right Academic Summary Card */}
                  <div className="hidden lg:block absolute right-2 top-8 z-30 w-56 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-purple-100/80 dark:border-slate-700/80 p-3.5 shadow-xl text-left">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                        {hero.summaryTitle}
                      </span>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/70 text-[#7C3AED] dark:text-[#C4B5FD]">
                        {hero.summaryStatus}
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          <span>{hero.attendanceLabel}</span>
                          <span className="text-[#7C3AED] dark:text-[#C4B5FD]">
                            {hero.attendanceValue}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-purple-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full w-[94%] rounded-full bg-[#7C3AED]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          <span>{hero.feeCollectionLabel}</span>
                          <span className="text-rose-500 dark:text-rose-400">
                            {hero.feeCollectionValue}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-rose-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full w-[88%] rounded-full bg-rose-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* 2. BENTO FEATURE GRID: EVERYTHING YOU NEED FOR BETTER LEARNING         */}
      {/* ===================================================================== */}
      {visibility.features && (
        <section id="features" className="max-w-[1160px] mx-auto px-5 sm:px-8 pt-20 sm:pt-24 pb-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#111118] dark:text-white tracking-tight leading-tight">
              {features.headlineLine1}
              {features.headlineLine2 && (
                <>
                  <br />
                  {features.headlineLine2}
                </>
              )}
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {features.subtitle}
            </p>
          </div>

          {/* 3-Column Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            <div className="flex flex-col gap-5">
              {col1Features.map((item) => (
                <FeatureBentoCard key={item.id || item.title} item={item} onOpenDemo={openDemo} />
              ))}
            </div>

            <div className="flex flex-col gap-5">
              <div
                className="rounded-3xl p-5 pb-0 overflow-hidden border border-purple-200/70 dark:border-purple-900/50 flex flex-col items-center justify-end"
                style={{
                  background:
                    "linear-gradient(165deg, #B589FF 0%, #D9C4FF 55%, #F2ECFF 100%)",
                }}
              >
                <div
                  data-keep-light="true"
                  className="w-[215px] bg-[#14141B] rounded-t-[28px] p-2 pb-0 shadow-xl"
                >
                  <div className="bg-white rounded-t-[22px] p-3 pb-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-900">
                        {features.phoneCardTitle}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold">
                        {features.phoneCardBadge}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { cls: "Computer Science", st: "Present", col: "text-emerald-600" },
                        { cls: "Mathematics 201", st: "Present", col: "text-emerald-600" },
                        { cls: "Applied Physics", st: "Excused", col: "text-[#7C3AED]" },
                      ].map((row) => (
                        <div
                          key={row.cls}
                          className="rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-1.5 flex items-center justify-between"
                        >
                          <span className="text-[9px] font-semibold text-slate-800">
                            {row.cls}
                          </span>
                          <span className={`text-[8.5px] font-bold ${row.col}`}>
                            {row.st}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {col2Feature && (
                <FeatureBentoCard
                  key={col2Feature.id || col2Feature.title}
                  item={col2Feature}
                  onOpenDemo={openDemo}
                />
              )}
            </div>

            <div className="flex flex-col gap-5">
              {col3Features.map((item) => (
                <FeatureBentoCard key={item.id || item.title} item={item} onOpenDemo={openDemo} />
              ))}
            </div>
          </div>

          {/* Extra dynamic features added from Super Admin Editor */}
          {extraFeatures.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
              {extraFeatures.map((item) => (
                <FeatureBentoCard key={item.id || item.title} item={item} onOpenDemo={openDemo} />
              ))}
            </div>
          )}

          {/* Centered Soft-Lavender Pill CTA */}
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => openDemo()}
              className="pl-6 pr-2 py-2 rounded-full bg-gradient-to-r from-[#D8B4FE] to-[#A855F7] hover:from-[#C084FC] hover:to-[#9333EA] text-white text-xs font-bold inline-flex items-center gap-3 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
            >
              <span>{features.bottomCtaLabel}</span>
              <span className="h-7 w-7 rounded-full bg-white text-[#7C3AED] flex items-center justify-center">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* 2B. SCHOOL TYPES SHOWCASE (UNIVERSITY / HIGH SCHOOL / VOCATIONAL)      */}
      {/* ===================================================================== */}
      {visibility.school_types && (
        <section
          id="school-types"
          className="bg-[#FAFAFC] dark:bg-slate-950/60 border-y border-slate-100 dark:border-slate-800/80 py-16 sm:py-20"
        >
          <div className="max-w-[1160px] mx-auto px-5 sm:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              {school_types.badge && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/70 border border-purple-100 dark:border-purple-800/60 text-[#7C3AED] dark:text-[#C4B5FD] text-[11px] font-bold">
                  {school_types.badge}
                </span>
              )}
              <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-[#111118] dark:text-white tracking-tight leading-tight">
                {school_types.headlineLine1}
                {school_types.headlineLine2 && (
                  <>
                    <br />
                    {school_types.headlineLine2}
                  </>
                )}
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {school_types.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(school_types.items || []).map((item) => (
                <SchoolTypeCard
                  key={item.id || item.title}
                  item={item}
                  onExplore={(mod) => openDemo(mod)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* 3. EXAM RESULTS SPOTLIGHT                                              */}
      {/* ===================================================================== */}
      {visibility.results_spotlight && (
        <section id="results-spotlight" className="max-w-[1160px] mx-auto px-5 sm:px-8 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div
              className="rounded-[32px] p-8 pb-0 border border-purple-200/70 dark:border-purple-900/50 flex justify-center items-end overflow-hidden min-h-[380px]"
              style={{
                background:
                  "linear-gradient(150deg, #9F67FF 0%, #C7A6FF 45%, #F2EBFF 100%)",
              }}
            >
              <div
                data-keep-light="true"
                className="w-[270px] sm:w-[295px] bg-[#14141B] rounded-t-[36px] p-2.5 pb-0 shadow-2xl"
              >
                <div className="bg-white rounded-t-[28px] p-5 pb-6 text-left">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-extrabold text-slate-900">
                      {results_spotlight.phoneTitle}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-[#7C3AED] text-[10px] font-bold">
                      {results_spotlight.phoneTerm}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mb-5">
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                      <div className="text-[10px] text-slate-500 font-medium">
                        {results_spotlight.rankLabel}
                      </div>
                      <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                        {results_spotlight.rankValue}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                      <div className="text-[10px] text-slate-500 font-medium">
                        {results_spotlight.averageLabel}
                      </div>
                      <div className="text-lg font-extrabold text-[#7C3AED] mt-0.5">
                        {results_spotlight.averageValue}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 p-4 flex flex-col items-center">
                    <div className="text-[10.5px] font-bold text-slate-700 mb-3 self-start">
                      {results_spotlight.proficiencyLabel}
                    </div>
                    <div className="relative h-28 w-28 flex items-center justify-center">
                      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#F1EAFF"
                          strokeWidth="3.8"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#8B5CF6"
                          strokeWidth="3.8"
                          strokeDasharray={`${proficiencyNum}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute text-xl font-extrabold text-slate-900">
                        {results_spotlight.proficiencyValue}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                {results_spotlight.badge && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/70 border border-purple-100 dark:border-purple-800/60 text-[#7C3AED] dark:text-[#C4B5FD] text-[11px] font-bold">
                    {results_spotlight.badge}
                  </span>
                )}
                <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-[#111118] dark:text-white tracking-tight leading-tight">
                  {results_spotlight.headlineLine1}
                  {results_spotlight.headlineLine2 && (
                    <>
                      <br />
                      {results_spotlight.headlineLine2}
                    </>
                  )}
                </h2>
                <p className="mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                  {results_spotlight.subtitle}
                </p>
              </div>

              <div className="space-y-4">
                {(results_spotlight.highlights || []).map((hl, idx) => {
                  const Icon = RESULT_ICON_MAP[hl.icon] || CheckCircle2;
                  return (
                    <div key={`${hl.title}-${idx}`} className="flex items-start gap-3.5">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#9353FF] to-[#7C3AED] text-white flex items-center justify-center shrink-0">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {hl.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {hl.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* 4. ABOUT / EMPOWERING SCHOOLS SECTION                                  */}
      {/* ===================================================================== */}
      {visibility.about_stats && (
        <section id="about" className="max-w-[1160px] mx-auto px-5 sm:px-8 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-5">
              {about_stats.badge && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/70 border border-purple-100 dark:border-purple-800/60 text-[#7C3AED] dark:text-[#C4B5FD] text-[11px] font-bold">
                  {about_stats.badge}
                </span>
              )}

              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#111118] dark:text-white tracking-tight leading-tight">
                {about_stats.headlineLine1}
                {about_stats.headlineLine2 && (
                  <>
                    <br />
                    {about_stats.headlineLine2}
                  </>
                )}
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                {about_stats.description}
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => openDemo(about_stats.ctaModule || "Multi-Tenant Governance")}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-[#9353FF] to-[#7C3AED] hover:from-[#8B5CF6] hover:to-[#6D28D9] text-white text-xs font-bold shadow-md shadow-purple-500/25 transition-all cursor-pointer active:scale-[0.98]"
                >
                  {about_stats.ctaLabel}
                </button>
              </div>
            </div>

            <div className="relative pb-6 sm:pb-0 sm:pl-10">
              <div className="rounded-[28px] overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800 aspect-[4/3] bg-slate-100 dark:bg-slate-900">
                <img
                  src={about_stats.imageUrl || "/images/classroom-showcase.png"}
                  alt={about_stats.imageAlt}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="relative sm:absolute sm:-bottom-6 sm:left-0 mt-4 sm:mt-0 w-full sm:w-52 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 shadow-xl space-y-4">
                {(about_stats.stats || []).map((st, idx) => (
                  <div
                    key={`${st.label}-${idx}`}
                    className={idx > 0 ? "pt-3 border-t border-slate-100 dark:border-slate-800" : ""}
                  >
                    <div className="text-xl font-extrabold text-slate-900 dark:text-white leading-none">
                      {st.value}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                      {st.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* 5. PRICING SECTION                                                     */}
      {/* ===================================================================== */}
      {visibility.pricing && (
        <section id="pricing" className="max-w-[1160px] mx-auto px-5 sm:px-8 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto">
            {pricing.badge && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/70 border border-purple-100 dark:border-purple-800/60 text-[#7C3AED] dark:text-[#C4B5FD] text-[11px] font-bold">
                {pricing.badge}
              </span>
            )}
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-[#111118] dark:text-white tracking-tight leading-tight">
              {pricing.headlineLine1}
              {pricing.headlineLine2 && (
                <>
                  <br />
                  {pricing.headlineLine2}
                </>
              )}
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {pricing.subtitle}
            </p>

            <div className="mt-6 inline-flex items-center gap-1 rounded-full bg-[#F4F2FA] dark:bg-slate-900 border border-purple-100 dark:border-slate-800 p-1">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {pricing.monthlyLabel}
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer ${
                  billingCycle === "annual"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{pricing.annualLabel}</span>
                {pricing.annualBadge && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/70 text-[#7C3AED] dark:text-[#C4B5FD] text-[10px] font-bold">
                    {pricing.annualBadge}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mt-12">
            {(pricing.tiers || []).map((tier) => {
              const displayPrice =
                tier.customPriceLabel?.trim() ||
                (billingCycle === "annual" ? tier.annualPrice : tier.monthlyPrice);
              const isCustomPrice =
                Boolean(tier.customPriceLabel?.trim()) ||
                displayPrice.toLowerCase() === "custom";
              const billingNote =
                billingCycle === "annual"
                  ? tier.annualBillingNote
                  : tier.monthlyBillingNote;

              if (tier.highlighted) {
                return (
                  <div
                    key={tier.id || tier.name}
                    className="relative rounded-3xl p-7 flex flex-col justify-between gap-6 text-white shadow-2xl shadow-purple-500/25 border border-purple-400/40 lg:-translate-y-2"
                    style={{
                      background:
                        "linear-gradient(155deg, #6D28D9 0%, #7C3AED 48%, #9353FF 100%)",
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-extrabold text-white">
                          {tier.name}
                        </h3>
                        {tier.badge && (
                          <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/25 text-white text-[10px] font-bold">
                            {tier.badge}
                          </span>
                        )}
                      </div>
                      {tier.audienceSubtitle && (
                        <p className="mt-1 text-[11px] font-semibold text-purple-100">
                          {tier.audienceSubtitle}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-purple-100/90 leading-relaxed">
                        {tier.description}
                      </p>

                      <div className="mt-6 pb-6 border-b border-white/15">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-white tracking-tight">
                            {displayPrice}
                          </span>
                          {!isCustomPrice && (
                            <span className="text-xs font-semibold text-purple-100">
                              /mo
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] font-medium text-purple-100">
                          {billingNote}
                        </p>
                      </div>

                      <ul className="mt-6 space-y-3 text-xs text-white/95">
                        {(tier.features || []).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <CheckCircle2 className="h-4 w-4 text-[#E9D5FF] shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        tier.ctaAction === "sales"
                          ? openSales()
                          : openDemo(undefined, tier.name)
                      }
                      className="w-full py-3 rounded-full bg-white hover:bg-purple-50 text-[#6D28D9] text-xs font-bold shadow-md inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>{tier.ctaLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={tier.id || tier.name}
                  className="rounded-3xl bg-[#F7F7FA] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-7 flex flex-col justify-between gap-6 hover:border-purple-200 dark:hover:border-purple-700/70 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {tier.name}
                      </h3>
                      {tier.badge && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {tier.badge}
                        </span>
                      )}
                    </div>
                    {tier.audienceSubtitle && (
                      <p className="mt-1 text-[11px] font-semibold text-[#7C3AED] dark:text-[#C4B5FD]">
                        {tier.audienceSubtitle}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {tier.description}
                    </p>

                    <div className="mt-6 pb-6 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                          {displayPrice}
                        </span>
                        {!isCustomPrice && (
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            /mo
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {billingNote}
                      </p>
                    </div>

                    <ul className="mt-6 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                      {(tier.features || []).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-4 w-4 text-[#7C3AED] dark:text-[#C4B5FD] shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {tier.ctaAction === "sales" ? (
                    <button
                      type="button"
                      onClick={openSales}
                      className="w-full py-3 rounded-full bg-[#0F0F14] dark:bg-white hover:bg-slate-800 dark:hover:bg-purple-50 text-white dark:text-[#0F0F14] text-xs font-bold shadow-md inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-[#C4B5FD] dark:text-[#7C3AED]" />
                      <span>{tier.ctaLabel}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openDemo(undefined, tier.name)}
                      className="w-full py-3 rounded-full bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200/90 dark:border-slate-700 text-xs font-bold shadow-2xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <span>{tier.ctaLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-[#7C3AED] dark:text-[#C4B5FD]" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>{pricing.trustNote}</span>
            {pricing.trustActionLabel && (
              <button
                type="button"
                onClick={openSales}
                className="font-bold text-[#7C3AED] dark:text-[#C4B5FD] hover:text-[#6D28D9] dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{pricing.trustActionLabel}</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* 6. TESTIMONIALS SECTION (3-COLUMN GRID)                                */}
      {/* ===================================================================== */}
      {visibility.testimonials && (
        <section
          id="reviews"
          className="bg-[#FAFAFC] dark:bg-slate-950/60 border-y border-slate-100 dark:border-slate-800/80 py-16 sm:py-22"
        >
          <div className="max-w-[1160px] mx-auto px-5 sm:px-8">
            <div className="max-w-2xl mx-auto text-center mb-12">
              {testimonials.badge && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/70 border border-purple-100 dark:border-purple-800/60 text-[#7C3AED] dark:text-[#C4B5FD] text-[11px] font-bold">
                  {testimonials.badge}
                </span>
              )}
              <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-[#111118] dark:text-white tracking-tight leading-tight">
                {testimonials.headlineLine1}
                {testimonials.headlineLine2 && (
                  <>
                    <br />
                    {testimonials.headlineLine2}
                  </>
                )}
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {testimonials.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(testimonials.items || []).map((item, idx) => (
                <TestimonialCard key={`${item.name}-${idx}`} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* 6B. FAQ ACCORDION SECTION                                              */}
      {/* ===================================================================== */}
      {visibility.faq && (faq.items || []).length > 0 && (
        <section id="faq" className="max-w-[920px] mx-auto px-5 sm:px-8 pt-16 sm:pt-20 pb-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            {faq.badge && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/70 border border-purple-100 dark:border-purple-800/60 text-[#7C3AED] dark:text-[#C4B5FD] text-[11px] font-bold">
                {faq.badge}
              </span>
            )}
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-[#111118] dark:text-white tracking-tight leading-tight">
              {faq.headlineLine1}
              {faq.headlineLine2 && (
                <>
                  <br />
                  {faq.headlineLine2}
                </>
              )}
            </h2>
            <p className="mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {faq.subtitle}
            </p>
          </div>

          <div className="space-y-3">
            {faq.items.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={`${item.question}-${idx}`}
                  className="rounded-2xl bg-[#F7F7FA] dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#7C3AED] dark:text-[#C4B5FD] transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 pt-0 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-800/80 mt-0 pt-3">
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* 7. FULL-WIDTH PURPLE CTA BANNER                                        */}
      {/* ===================================================================== */}
      {visibility.cta_banner && (
        <section id="cta-banner" className="max-w-[1160px] mx-auto px-5 sm:px-8 py-16 sm:py-20">
          <div
            className="relative rounded-[32px] overflow-hidden px-7 sm:px-12 pt-10 sm:pt-12 pb-10 lg:pb-0 text-white shadow-2xl shadow-purple-500/20"
            style={{
              background:
                "linear-gradient(135deg, #6D28D9 0%, #8B5CF6 55%, #A78BFA 100%)",
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-7 lg:pb-12 space-y-4">
                <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight leading-[1.1]">
                  {cta_banner.headlineLine1}
                  {cta_banner.headlineLine2 && (
                    <>
                      <br />
                      {cta_banner.headlineLine2}
                    </>
                  )}
                  {cta_banner.headlineLine3 && (
                    <>
                      <br />
                      {cta_banner.headlineLine3}
                    </>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-purple-100 max-w-md leading-relaxed">
                  {cta_banner.subtitle}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openDemo()}
                    className="px-6 py-3 rounded-full bg-[#0F0F14] hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#C4B5FD]" />
                    <span>{cta_banner.primaryCtaLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={openSales}
                    className="px-6 py-3 rounded-full bg-white hover:bg-purple-50 text-slate-900 text-xs font-bold inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-[#7C3AED]" />
                    <span>{cta_banner.secondaryCtaLabel}</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 flex justify-center lg:justify-end">
                <div className="w-[260px] sm:w-[285px]">
                  <CenterPhoneScreen compact onOpenDemo={() => openDemo()} />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* 8. DARK OBSIDIAN FOOTER + OVERSIZED ERUDIAN360 WORDMARK                */}
      {/* ===================================================================== */}
      {visibility.footer && (
        <footer id="footer" className="bg-[#0B0B0F] text-white pt-16 overflow-hidden border-t border-slate-800/80">
          <div className="max-w-[1160px] mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12">
              <div className="md:col-span-5 space-y-4">
                <ErudianLogo
                  variant="dark"
                  size="md"
                  brandPrimary={navbar.brandPrimary}
                  brandAccent={navbar.brandAccent}
                />
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  {footer.description}
                </p>
                <div className="space-y-2 text-xs text-slate-200">
                  {footer.email && (
                    <a
                      href={`mailto:${footer.email}`}
                      className="flex items-center gap-2 font-semibold hover:text-[#C4B5FD] transition-colors w-fit"
                    >
                      <Mail className="h-3.5 w-3.5 text-[#A78BFA]" />
                      <span>{footer.email}</span>
                    </a>
                  )}
                  {footer.phone && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="h-3.5 w-3.5 text-[#A78BFA]" />
                      <span>{footer.phone}</span>
                    </div>
                  )}
                  {footer.address && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-[#A78BFA]" />
                      <span>{footer.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-3 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {footer.productHeading}
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  {(footer.productLinks || []).map((item) =>
                    renderFooterItem(item, "prod")
                  )}
                </ul>
              </div>

              <div className="md:col-span-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {footer.resourcesHeading}
                </h3>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  {(footer.resourcesLinks || []).map((item) =>
                    renderFooterItem(item, "res")
                  )}
                </ul>
              </div>
            </div>

            <div className="py-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
              <span>{footer.copyright}</span>
              <div className="flex items-center gap-5">
                {(footer.legalLinks || []).map((link, idx) =>
                  link.href?.startsWith("/") ? (
                    <Link
                      key={`leg-${link.label}-${idx}`}
                      href={link.href}
                      className="hover:text-slate-300 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={`leg-${link.label}-${idx}`}
                      href={link.href || "#home"}
                      className="hover:text-slate-300 transition-colors"
                    >
                      {link.label}
                    </a>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="max-w-[1260px] mx-auto px-3 sm:px-6 select-none pointer-events-none overflow-hidden">
            <div
              className="text-center font-extrabold tracking-[-0.04em] leading-[0.82] text-white/95 translate-y-[12%]"
              style={{ fontSize: "clamp(3.6rem, 15.5vw, 13.5rem)" }}
            >
              {footer.wordmark}
            </div>
          </div>
        </footer>
      )}

      {/* ===================================================================== */}
      {/* INTERACTIVE REQUEST DEMO & CHAT WITH SALES MODALS                      */}
      {/* ===================================================================== */}
      {demoModalOpen && (
        <RequestDemoModal
          open={demoModalOpen}
          onClose={() => setDemoModalOpen(false)}
          defaultModule={demoModule}
          defaultPlan={demoPlan}
        />
      )}

      {salesModalOpen && (
        <ChatWithSalesModal
          open={salesModalOpen}
          onClose={() => setSalesModalOpen(false)}
          onSwitchToDemo={() => openDemo()}
        />
      )}
    </div>
  );
}
