export const LANDING_SECTION_KEYS = [
  "navbar",
  "hero",
  "features",
  "school_types",
  "results_spotlight",
  "about_stats",
  "pricing",
  "testimonials",
  "faq",
  "cta_banner",
  "footer",
] as const;

export type LandingSectionKey = (typeof LANDING_SECTION_KEYS)[number];

export interface NavLinkItem {
  label: string;
  href: string;
}

export interface NavbarSectionContent {
  brandPrimary: string;
  brandAccent: string;
  logoUrl: string;
  navLinks: NavLinkItem[];
  signInLabel: string;
  signInHref: string;
  ctaLabel: string;
}

export interface HeroAlertBadge {
  label: string;
  value: string;
  tone: "purple" | "sky" | "emerald";
}

export interface HeroSectionContent {
  headlineLine1: string;
  headlineLine2: string;
  subheading: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  heroImageUrl: string;
  alertBadges: HeroAlertBadge[];
  summaryTitle: string;
  summaryStatus: string;
  attendanceLabel: string;
  attendanceValue: string;
  feeCollectionLabel: string;
  feeCollectionValue: string;
}

export type FeatureIconKey =
  | "users"
  | "chart"
  | "credit-card"
  | "user-check"
  | "message-square"
  | "graduation-cap"
  | "calendar"
  | "book-open"
  | "award"
  | "sparkles";

export interface FeatureCardItem {
  id: string;
  title: string;
  description: string;
  demoModule: string;
  icon: FeatureIconKey;
}

export interface FeaturesSectionContent {
  headlineLine1: string;
  headlineLine2: string;
  subtitle: string;
  bottomCtaLabel: string;
  phoneCardTitle: string;
  phoneCardBadge: string;
  items: FeatureCardItem[];
}

export interface SchoolTypeShowcaseItem {
  id: string;
  typeKey: "university" | "high_school" | "vocational";
  badge: string;
  title: string;
  description: string;
  ctaLabel: string;
  bullets: string[];
}

export interface SchoolTypesSectionContent {
  badge: string;
  headlineLine1: string;
  headlineLine2: string;
  subtitle: string;
  items: SchoolTypeShowcaseItem[];
}

export interface ResultsHighlightItem {
  title: string;
  description: string;
  icon: "check-circle" | "trending-up" | "award";
}

export interface ResultsSpotlightSectionContent {
  badge: string;
  headlineLine1: string;
  headlineLine2: string;
  subtitle: string;
  phoneTitle: string;
  phoneTerm: string;
  rankLabel: string;
  rankValue: string;
  averageLabel: string;
  averageValue: string;
  proficiencyLabel: string;
  proficiencyValue: string;
  highlights: ResultsHighlightItem[];
}

export interface StatMetricItem {
  value: string;
  label: string;
}

export interface AboutStatsSectionContent {
  badge: string;
  headlineLine1: string;
  headlineLine2: string;
  description: string;
  ctaLabel: string;
  ctaModule: string;
  imageUrl: string;
  imageAlt: string;
  stats: StatMetricItem[];
}

export interface PricingTierItem {
  id: string;
  name: string;
  badge: string;
  audienceSubtitle: string;
  description: string;
  monthlyPrice: string;
  annualPrice: string;
  customPriceLabel: string;
  annualBillingNote: string;
  monthlyBillingNote: string;
  highlighted: boolean;
  ctaLabel: string;
  ctaAction: "demo" | "sales";
  features: string[];
}

export interface PricingSectionContent {
  badge: string;
  headlineLine1: string;
  headlineLine2: string;
  subtitle: string;
  monthlyLabel: string;
  annualLabel: string;
  annualBadge: string;
  trustNote: string;
  trustActionLabel: string;
  tiers: PricingTierItem[];
}

export interface TestimonialItem {
  name: string;
  role: string;
  quote: string;
  source: "Capterra" | "Trustpilot" | "G2";
  initials: string;
  avatarBg: string;
}

export interface TestimonialsSectionContent {
  badge: string;
  headlineLine1: string;
  headlineLine2: string;
  subtitle: string;
  items: TestimonialItem[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqSectionContent {
  badge: string;
  headlineLine1: string;
  headlineLine2: string;
  subtitle: string;
  items: FaqItem[];
}

export interface CtaBannerSectionContent {
  headlineLine1: string;
  headlineLine2: string;
  headlineLine3: string;
  subtitle: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
}

export interface FooterActionLink {
  label: string;
  href: string;
  action: "link" | "demo" | "sales";
  demoModule?: string;
}

export interface FooterSectionContent {
  description: string;
  email: string;
  phone: string;
  address: string;
  productHeading: string;
  productLinks: FooterActionLink[];
  resourcesHeading: string;
  resourcesLinks: FooterActionLink[];
  copyright: string;
  legalLinks: NavLinkItem[];
  wordmark: string;
}

export interface LandingPageContent {
  navbar: NavbarSectionContent;
  hero: HeroSectionContent;
  features: FeaturesSectionContent;
  school_types: SchoolTypesSectionContent;
  results_spotlight: ResultsSpotlightSectionContent;
  about_stats: AboutStatsSectionContent;
  pricing: PricingSectionContent;
  testimonials: TestimonialsSectionContent;
  faq: FaqSectionContent;
  cta_banner: CtaBannerSectionContent;
  footer: FooterSectionContent;
  visibility: Record<LandingSectionKey, boolean>;
}

export interface LandingSectionMeta {
  key: LandingSectionKey;
  label: string;
  shortLabel: string;
  description: string;
  anchor: string;
}

export const LANDING_SECTIONS_META: LandingSectionMeta[] = [
  {
    key: "navbar",
    label: "Navbar & Branding",
    shortLabel: "Navbar",
    description: "Brand logo, navigation links, sign-in button, and top CTA.",
    anchor: "#home",
  },
  {
    key: "hero",
    label: "Hero Section",
    shortLabel: "Hero",
    description: "Main hero headline, subheading, buttons, floating badges, and summary metrics.",
    anchor: "#home",
  },
  {
    key: "features",
    label: "Features Bento Grid",
    shortLabel: "Features",
    description: "Core product capabilities, card descriptions, and attendance preview card.",
    anchor: "#features",
  },
  {
    key: "school_types",
    label: "School Types Showcase",
    shortLabel: "School Types",
    description: "University, High School, and Vocational specialized portal highlights.",
    anchor: "#school-types",
  },
  {
    key: "results_spotlight",
    label: "Exam Results Spotlight",
    shortLabel: "Results",
    description: "Exam analytics phone preview and highlight points.",
    anchor: "#results-spotlight",
  },
  {
    key: "about_stats",
    label: "About & Trusted Stats",
    shortLabel: "About & Stats",
    description: "Classroom photography, institutional story copy, and trusted stat counters.",
    anchor: "#about",
  },
  {
    key: "pricing",
    label: "Pricing Plans",
    shortLabel: "Pricing",
    description: "Billing toggles, Starter/Professional/Enterprise pricing tiers, and feature lists.",
    anchor: "#pricing",
  },
  {
    key: "testimonials",
    label: "Testimonials Grid",
    shortLabel: "Reviews",
    description: "3-column review cards from school leaders across campuses.",
    anchor: "#reviews",
  },
  {
    key: "faq",
    label: "FAQ Accordion",
    shortLabel: "FAQ",
    description: "Expandable answers for institutional buyers and IT administrators.",
    anchor: "#faq",
  },
  {
    key: "cta_banner",
    label: "Bottom CTA Banner",
    shortLabel: "CTA Banner",
    description: "Full-width bottom conversion banner headline, copy, and buttons.",
    anchor: "#cta-banner",
  },
  {
    key: "footer",
    label: "Footer & Contact Info",
    shortLabel: "Footer",
    description: "Contact email/phone/address, footer link columns, copyright, and wordmark.",
    anchor: "#footer",
  },
];

export const DEFAULT_LANDING_PAGE_CONTENT: LandingPageContent = {
  navbar: {
    brandPrimary: "Erudian",
    brandAccent: "360",
    logoUrl: "",
    navLinks: [
      { label: "Home", href: "#home" },
      { label: "About", href: "#about" },
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Reviews", href: "#reviews" },
    ],
    signInLabel: "Sign In",
    signInHref: "/login",
    ctaLabel: "Request Demo",
  },
  hero: {
    headlineLine1: "Smart School Management",
    headlineLine2: "for Every Student",
    subheading:
      "The all-in-one multi-tenant platform unifying admissions, attendance, exams, fees, and campus governance for universities, high schools, and vocational institutions.",
    primaryCtaLabel: "Request Demo",
    secondaryCtaLabel: "Chat with Sales",
    heroImageUrl: "",
    alertBadges: [
      { label: "Overall Grade Avg", value: "94.2%", tone: "purple" },
      { label: "Parent-Teacher Meeting", value: "Thu 10AM", tone: "sky" },
      { label: "Exam Timetable Ready", value: "Published", tone: "emerald" },
    ],
    summaryTitle: "Academic Summary",
    summaryStatus: "Live",
    attendanceLabel: "Attendance Rate",
    attendanceValue: "94.6%",
    feeCollectionLabel: "Fee Collection",
    feeCollectionValue: "88.2%",
  },
  features: {
    headlineLine1: "Everything You Need for",
    headlineLine2: "Better Learning",
    subtitle:
      "From managing student profiles and tracking attendance to automating fee collections, Erudian360 connects every stakeholder in one multi-tenant workspace.",
    bottomCtaLabel: "Request Demo",
    phoneCardTitle: "Attendance Log",
    phoneCardBadge: "96% Present",
    items: [
      {
        id: "student-management",
        title: "Student Management",
        description:
          "Maintain complete admissions, academic profiles, class assignments, and enrollment histories scoped cleanly per campus.",
        demoModule: "Student Management",
        icon: "users",
      },
      {
        id: "academic-performance",
        title: "Academic Performance",
        description:
          "Publish exam scores, GPA transcripts, and term progress reports tailored to University, High School, or Vocational standards.",
        demoModule: "Exams & Grading",
        icon: "chart",
      },
      {
        id: "fee-management",
        title: "Fee Management",
        description:
          "Automate fee schedules, generate student invoices, issue instant receipts, and empower Bursar and Finance teams in real time.",
        demoModule: "Fees & Billing",
        icon: "credit-card",
      },
      {
        id: "attendance-tracking",
        title: "Attendance Tracking",
        description:
          "Capture daily class registers in seconds with automatic absence alerts for lecturers, teachers, guardians, and administrators.",
        demoModule: "Attendance Tracking",
        icon: "user-check",
      },
      {
        id: "parent-communication",
        title: "Parent Communication",
        description:
          "Keep families informed with direct announcements, fee reminders, attendance summaries, and dedicated parent ward portals.",
        demoModule: "Parent Communication",
        icon: "message-square",
      },
    ],
  },
  school_types: {
    badge: "School Types Showcase",
    headlineLine1: "Specialized Portals for",
    headlineLine2: "Every Institution Type",
    subtitle:
      "Configure Erudian360 once and automatically adapt navigation, grading rules, forms, and workflows for your institution model.",
    items: [
      {
        id: "university",
        typeKey: "university",
        badge: "University",
        title: "Universities & Colleges",
        description:
          "Credit-unit curricula, faculties, departments, degree programs, lecturer moderation, GPA/CGPA transcripts, and campus housing.",
        ctaLabel: "Explore University Portal",
        bullets: [
          "Faculties, departments & degree programs",
          "Course registration, GPA/CGPA & transcripts",
          "Lecturer grading workflows & hostel allocation",
        ],
      },
      {
        id: "high_school",
        typeKey: "high_school",
        badge: "High School",
        title: "Senior High Schools",
        description:
          "Classrooms, form teachers, continuous assessment gradebooks, end-of-term report cards, and dedicated parent ward visibility.",
        ctaLabel: "Explore High School Portal",
        bullets: [
          "Forms, streams & subject allocations",
          "CA scores, mark sheets & report cards",
          "Guardian ward tracking & PTA messaging",
        ],
      },
      {
        id: "vocational",
        typeKey: "vocational",
        badge: "Vocational",
        title: "Vocational & Technical",
        description:
          "Trade cohorts, practical workshop logs, competency-based certification, equipment checkouts, and apprentice placements.",
        ctaLabel: "Explore Vocational Portal",
        bullets: [
          "Trade cohorts & workshop bay scheduling",
          "Competency rubrics & practical logbooks",
          "Equipment inventory & apprentice supervision",
        ],
      },
    ],
  },
  results_spotlight: {
    badge: "Exam Results",
    headlineLine1: "Monitor Student",
    headlineLine2: "Results with Ease",
    subtitle:
      "Stay informed about grades, continuous assessments, and term rankings in one secure, role-scoped platform with detailed performance analytics.",
    phoneTitle: "Exam Results",
    phoneTerm: "Term 1",
    rankLabel: "Class Rank",
    rankValue: "2nd",
    averageLabel: "Average",
    averageValue: "92%",
    proficiencyLabel: "Overall Proficiency",
    proficiencyValue: "95%",
    highlights: [
      {
        title: "Instant Result Access",
        description:
          "Check approved exam results immediately with subject breakdowns, moderation logs, and cumulative GPA.",
        icon: "check-circle",
      },
      {
        title: "Performance Insights",
        description:
          "Track term-over-term progress across departments, classes, and academic cohorts for faster intervention.",
        icon: "trending-up",
      },
    ],
  },
  about_stats: {
    badge: "About Erudian360",
    headlineLine1: "Empowering Schools with",
    headlineLine2: "Smart Management",
    description:
      "Simplify campus operations with one unified multi-tenant platform for academics, attendance, bursary billing, parent communication, and institutional analytics built to elevate outcomes.",
    ctaLabel: "Request Demo",
    ctaModule: "Multi-Tenant Governance",
    imageUrl: "/images/classroom-showcase.png",
    imageAlt:
      "Teacher leading diverse engaged students inside a sunlit modern classroom powered by Erudian360",
    stats: [
      { value: "10,000+", label: "Students Managed" },
      { value: "500+", label: "Teachers Connected" },
      { value: "100+", label: "Schools & Campuses" },
    ],
  },
  pricing: {
    badge: "Pricing Plans",
    headlineLine1: "Simple, Transparent Pricing",
    headlineLine2: "for Every Institution",
    subtitle:
      "Scale effortlessly from single-campus schools to multi-campus university networks with strict multi-tenant isolation and zero hidden fees.",
    monthlyLabel: "Monthly",
    annualLabel: "Annual",
    annualBadge: "Save 20%",
    trustNote:
      "Every plan includes strict school-level data isolation, automated encrypted backups, and zero setup surprises.",
    trustActionLabel: "Need a tailored quote? Chat with Sales",
    tiers: [
      {
        id: "starter",
        name: "Starter",
        badge: "High Schools & Vocational",
        audienceSubtitle: "",
        description:
          "Essential academic, attendance, and bursary workflows for growing single-campus schools.",
        monthlyPrice: "$249",
        annualPrice: "$199",
        customPriceLabel: "",
        annualBillingNote: "Billed annually ($2,388/yr)",
        monthlyBillingNote: "Billed monthly · Cancel anytime",
        highlighted: false,
        ctaLabel: "Request Demo",
        ctaAction: "demo",
        features: [
          "Up to 500 active students & 50 staff accounts",
          "Dynamic academic structure (Classes or Trades)",
          "Daily attendance tracking & absence alerts",
          "Exam grading, report cards & parent portal",
          "Fee invoicing, receipts & bursar workspace",
          "Email support & guided campus onboarding",
        ],
      },
      {
        id: "professional",
        name: "Professional",
        badge: "Most Popular",
        audienceSubtitle: "Universities, Colleges & Growing Schools",
        description:
          "Complete academic governance, finance automation, and role-scoped portals built for full institutions.",
        monthlyPrice: "$625",
        annualPrice: "$499",
        customPriceLabel: "",
        annualBillingNote: "Billed annually ($5,988/yr)",
        monthlyBillingNote: "Billed monthly · Cancel anytime",
        highlighted: true,
        ctaLabel: "Request Demo",
        ctaAction: "demo",
        features: [
          "Up to 2,500 active students & unlimited staff",
          "Full Departments, Programs & GPA transcripts",
          "Automated fee schedules & live bursar analytics",
          "Role-scoped Admin, Finance, Staff, Parent & Student portals",
          "Admissions pipelines & timetable management",
          "Real-time KPI dashboards & institutional reports",
          "Priority support & dedicated onboarding specialist",
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        badge: "Multi-Campus & Large Unis",
        audienceSubtitle: "",
        description:
          "Dedicated multi-tenant infrastructure, cross-campus governance, and custom integrations at scale.",
        monthlyPrice: "Custom",
        annualPrice: "Custom",
        customPriceLabel: "Custom",
        annualBillingNote: "Tailored to campus count & student volume",
        monthlyBillingNote: "Tailored to campus count & student volume",
        highlighted: false,
        ctaLabel: "Chat with Sales",
        ctaAction: "sales",
        features: [
          "Unlimited students, staff & campus tenants",
          "Super Admin cross-tenant governance console",
          "Custom branding, domain & SSO authentication",
          "Strict RLS tenant isolation & compliance audits",
          "Legacy data migration & custom API access",
          "Payment gateway & ERP billing integrations",
          "24/7 SLA, account manager & on-site training",
        ],
      },
    ],
  },
  testimonials: {
    badge: "Customer Reviews",
    headlineLine1: "See Why Schools Love",
    headlineLine2: "Erudian360 Today",
    subtitle:
      "Trusted by principals, registrars, bursars, and academic leaders across 100+ campuses.",
    items: [
      {
        name: "Daniel Addo",
        role: "School Principal",
        quote:
          "Erudian360 has transformed how we manage attendance, academics, and parent communication across every grade.",
        source: "Capterra",
        initials: "DA",
        avatarBg: "bg-indigo-100 text-indigo-700",
      },
      {
        name: "Michael Brown",
        role: "IT Administrator",
        quote:
          "The dashboard is intuitive, fast, and reliable. Multi-campus governance takes minutes instead of hours every week.",
        source: "Trustpilot",
        initials: "MB",
        avatarBg: "bg-emerald-100 text-emerald-700",
      },
      {
        name: "Grace Mensah",
        role: "Vice Principal",
        quote:
          "Result publishing, attendance alerts, and fee tracking all live in one unified portal that our entire staff loves.",
        source: "G2",
        initials: "GM",
        avatarBg: "bg-purple-100 text-purple-700",
      },
      {
        name: "Emily Carter",
        role: "Academic Coordinator",
        quote:
          "Managing student grades, classes, and reports used to take all weekend. Erudian360 handles it effortlessly.",
        source: "Trustpilot",
        initials: "EC",
        avatarBg: "bg-rose-100 text-rose-700",
      },
      {
        name: "Olivia Wilson",
        role: "Dean of Studies",
        quote:
          "Whether university programs or high school classes, Erudian360 adapts seamlessly to each campus workflow.",
        source: "G2",
        initials: "OW",
        avatarBg: "bg-sky-100 text-sky-700",
      },
      {
        name: "Samuel Boateng",
        role: "Bursar & Finance Officer",
        quote:
          "Automated invoicing, receipts, and bursar analytics have eliminated manual reconciliation errors completely.",
        source: "Trustpilot",
        initials: "SB",
        avatarBg: "bg-teal-100 text-teal-700",
      },
    ],
  },
  faq: {
    badge: "Frequently Asked Questions",
    headlineLine1: "Answers for School",
    headlineLine2: "Leaders & IT Teams",
    subtitle:
      "Clear details on security, onboarding, multi-campus scaling, and day-to-day workflows.",
    items: [
      {
        question: "How is student and financial data isolated between schools?",
        answer:
          "Every school operates as a strictly isolated tenant with database Row-Level Security (RLS) keyed on school_id. Users, invoices, grades, and files of one institution are never accessible to another.",
      },
      {
        question:
          "Does Erudian360 adapt to Universities, High Schools, and Vocational schools?",
        answer:
          "Yes. Each institution selects its school_type, which automatically customizes navigation menus, student creation forms, grading terminology, and portals without sacrificing unified platform management.",
      },
      {
        question: "Can we toggle individual portals or modules on and off?",
        answer:
          "Yes. Through the Super Admin Feature Flags console, administrators can enable or restrict specific portals (Student, Parent, Bursar, Teacher, Lecturer) globally or per school.",
      },
      {
        question: "Can we import existing student, staff, and fee records?",
        answer:
          "Yes. Our onboarding specialists and built-in import tools help migrate student rosters, academic structures, and historical balances cleanly before launch.",
      },
      {
        question: "How fast can our campus go live?",
        answer:
          "Single-campus high schools and vocational centers typically launch within 48 hours, while multi-campus university deployments are onboarded with dedicated guidance inside 1–2 weeks.",
      },
    ],
  },
  cta_banner: {
    headlineLine1: "Trusted Schools",
    headlineLine2: "& Students In",
    headlineLine3: "One Place",
    subtitle:
      "Erudian360 helps institutions unify departments, classes, attendance, billing, and student outcomes from day one.",
    primaryCtaLabel: "Request Demo",
    secondaryCtaLabel: "Chat with Sales",
  },
  footer: {
    description:
      "Empowering schools, colleges, and universities with an all-in-one multi-tenant platform for admissions, academics, finance, and campus administration.",
    email: "hello@erudian360.com",
    phone: "",
    address: "",
    productHeading: "Product",
    productLinks: [
      { label: "Features", href: "#features", action: "link" },
      { label: "Pricing", href: "#pricing", action: "link" },
      { label: "Request Demo", href: "", action: "demo" },
      { label: "Chat with Sales", href: "", action: "sales" },
      { label: "Reviews", href: "#reviews", action: "link" },
    ],
    resourcesHeading: "Resources",
    resourcesLinks: [
      { label: "Portal Sign In", href: "/login", action: "link" },
      { label: "About Erudian360", href: "#about", action: "link" },
      { label: "Multi-Campus Pricing", href: "", action: "sales" },
      {
        label: "Help Center & Onboarding",
        href: "",
        action: "demo",
        demoModule: "Multi-Tenant Governance",
      },
    ],
    copyright: "© 2026 Erudian360 Technologies. All rights reserved.",
    legalLinks: [
      { label: "Terms & Conditions", href: "#features" },
      { label: "Privacy Policy", href: "#about" },
      { label: "Sign In", href: "/login" },
    ],
    wordmark: "Erudian360",
  },
  visibility: {
    navbar: true,
    hero: true,
    features: true,
    school_types: true,
    results_spotlight: true,
    about_stats: true,
    pricing: true,
    testimonials: true,
    faq: true,
    cta_banner: true,
    footer: true,
  },
};

const OPTIONAL_EMPTY_STRING_FIELDS = new Set([
  "logoUrl",
  "heroImageUrl",
  "audienceSubtitle",
  "customPriceLabel",
  "badge",
  "phone",
  "address",
  "href",
  "demoModule",
  "headlineLine2",
  "headlineLine3",
]);

function cloneDefaultContent(): LandingPageContent {
  return JSON.parse(JSON.stringify(DEFAULT_LANDING_PAGE_CONTENT)) as LandingPageContent;
}

function mergeSectionValue(
  defaults: any,
  incoming: any,
  keyName?: string
): any {
  if (incoming === undefined || incoming === null) {
    return defaults;
  }

  if (Array.isArray(defaults)) {
    if (!Array.isArray(incoming)) {
      return defaults;
    }
    return incoming;
  }

  if (typeof defaults === "object" && defaults !== null) {
    if (typeof incoming !== "object" || Array.isArray(incoming)) {
      return defaults;
    }
    const merged: Record<string, any> = {};
    for (const k of Object.keys(defaults)) {
      merged[k] = mergeSectionValue(defaults[k], incoming[k], k);
    }
    for (const k of Object.keys(incoming)) {
      if (!(k in merged)) {
        merged[k] = incoming[k];
      }
    }
    return merged;
  }

  if (typeof defaults === "string") {
    if (typeof incoming !== "string") return defaults;
    if (incoming.trim() === "" && !OPTIONAL_EMPTY_STRING_FIELDS.has(keyName || "")) {
      return defaults;
    }
    return incoming;
  }

  if (typeof defaults === "boolean") {
    return typeof incoming === "boolean" ? incoming : defaults;
  }

  return incoming;
}

export interface LandingDbRow {
  section_key: string;
  content: any;
  is_visible?: boolean | null;
  updated_at?: string | null;
}

export function isValidLandingSectionKey(
  value: string
): value is LandingSectionKey {
  return (LANDING_SECTION_KEYS as readonly string[]).includes(value);
}

export function mergeLandingContentRows(rows: LandingDbRow[] | null | undefined): {
  content: LandingPageContent;
  updatedAtMap: Record<LandingSectionKey, string | null>;
} {
  const merged = cloneDefaultContent();
  const updatedAtMap: Record<LandingSectionKey, string | null> = {
    navbar: null,
    hero: null,
    features: null,
    school_types: null,
    results_spotlight: null,
    about_stats: null,
    pricing: null,
    testimonials: null,
    faq: null,
    cta_banner: null,
    footer: null,
  };

  if (!Array.isArray(rows)) {
    return { content: merged, updatedAtMap };
  }

  for (const row of rows) {
    if (!row || typeof row.section_key !== "string") continue;
    if (!isValidLandingSectionKey(row.section_key)) continue;

    const key = row.section_key;
    (merged as any)[key] = mergeSectionValue(
      DEFAULT_LANDING_PAGE_CONTENT[key],
      row.content
    );
    if (typeof row.is_visible === "boolean") {
      merged.visibility[key] = row.is_visible;
    }
    updatedAtMap[key] = row.updated_at ? String(row.updated_at) : null;
  }

  return { content: merged, updatedAtMap };
}
