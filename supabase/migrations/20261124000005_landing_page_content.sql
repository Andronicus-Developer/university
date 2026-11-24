-- ============================================================================
-- Migration: 20261124000005_landing_page_content.sql
-- Purpose:
--   Create `public.landing_page_content` storing dynamic JSONB content and
--   visibility flags for every section of the public Erudian360 landing page.
--   - Public SELECT access for anonymous and authenticated visitors.
--   - Writes restricted strictly to verified Super Admin users / service role.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.landing_page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landing_page_content_section_key
  ON public.landing_page_content (section_key);

ALTER TABLE public.landing_page_content ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.landing_page_content TO service_role;
GRANT SELECT ON public.landing_page_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.landing_page_content TO authenticated;

DROP POLICY IF EXISTS "Public read landing page content"
  ON public.landing_page_content;

CREATE POLICY "Public read landing page content"
  ON public.landing_page_content
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Super Admin manage landing page content"
  ON public.landing_page_content;

CREATE POLICY "Super Admin manage landing page content"
  ON public.landing_page_content
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Seed defaults matching the live Erudian360 landing page so zero UI change
-- occurs on initial deployment and empty fields safely fall back to defaults.
INSERT INTO public.landing_page_content (section_key, content, is_visible)
VALUES
  (
    'navbar',
    $json${
      "brandPrimary": "Erudian",
      "brandAccent": "360",
      "logoUrl": "",
      "navLinks": [
        { "label": "Home", "href": "#home" },
        { "label": "About", "href": "#about" },
        { "label": "Features", "href": "#features" },
        { "label": "Pricing", "href": "#pricing" },
        { "label": "Reviews", "href": "#reviews" }
      ],
      "signInLabel": "Sign In",
      "signInHref": "/login",
      "ctaLabel": "Request Demo"
    }$json$::jsonb,
    true
  ),
  (
    'hero',
    $json${
      "headlineLine1": "Smart School Management",
      "headlineLine2": "for Every Student",
      "subheading": "The all-in-one multi-tenant platform unifying admissions, attendance, exams, fees, and campus governance for universities, high schools, and vocational institutions.",
      "primaryCtaLabel": "Request Demo",
      "secondaryCtaLabel": "Chat with Sales",
      "heroImageUrl": "",
      "alertBadges": [
        { "label": "Overall Grade Avg", "value": "94.2%", "tone": "purple" },
        { "label": "Parent-Teacher Meeting", "value": "Thu 10AM", "tone": "sky" },
        { "label": "Exam Timetable Ready", "value": "Published", "tone": "emerald" }
      ],
      "summaryTitle": "Academic Summary",
      "summaryStatus": "Live",
      "attendanceLabel": "Attendance Rate",
      "attendanceValue": "94.6%",
      "feeCollectionLabel": "Fee Collection",
      "feeCollectionValue": "88.2%"
    }$json$::jsonb,
    true
  ),
  (
    'features',
    $json${
      "headlineLine1": "Everything You Need for",
      "headlineLine2": "Better Learning",
      "subtitle": "From managing student profiles and tracking attendance to automating fee collections, Erudian360 connects every stakeholder in one multi-tenant workspace.",
      "bottomCtaLabel": "Request Demo",
      "phoneCardTitle": "Attendance Log",
      "phoneCardBadge": "96% Present",
      "items": [
        {
          "id": "student-management",
          "title": "Student Management",
          "description": "Maintain complete admissions, academic profiles, class assignments, and enrollment histories scoped cleanly per campus.",
          "demoModule": "Student Management",
          "icon": "users"
        },
        {
          "id": "academic-performance",
          "title": "Academic Performance",
          "description": "Publish exam scores, GPA transcripts, and term progress reports tailored to University, High School, or Vocational standards.",
          "demoModule": "Exams & Grading",
          "icon": "chart"
        },
        {
          "id": "fee-management",
          "title": "Fee Management",
          "description": "Automate fee schedules, generate student invoices, issue instant receipts, and empower Bursar and Finance teams in real time.",
          "demoModule": "Fees & Billing",
          "icon": "credit-card"
        },
        {
          "id": "attendance-tracking",
          "title": "Attendance Tracking",
          "description": "Capture daily class registers in seconds with automatic absence alerts for lecturers, teachers, guardians, and administrators.",
          "demoModule": "Attendance Tracking",
          "icon": "user-check"
        },
        {
          "id": "parent-communication",
          "title": "Parent Communication",
          "description": "Keep families informed with direct announcements, fee reminders, attendance summaries, and dedicated parent ward portals.",
          "demoModule": "Parent Communication",
          "icon": "message-square"
        }
      ]
    }$json$::jsonb,
    true
  ),
  (
    'school_types',
    $json${
      "badge": "School Types Showcase",
      "headlineLine1": "Specialized Portals for",
      "headlineLine2": "Every Institution Type",
      "subtitle": "Configure Erudian360 once and automatically adapt navigation, grading rules, forms, and workflows for your institution model.",
      "items": [
        {
          "id": "university",
          "typeKey": "university",
          "badge": "University",
          "title": "Universities & Colleges",
          "description": "Credit-unit curricula, faculties, departments, degree programs, lecturer moderation, GPA/CGPA transcripts, and campus housing.",
          "ctaLabel": "Explore University Portal",
          "bullets": [
            "Faculties, departments & degree programs",
            "Course registration, GPA/CGPA & transcripts",
            "Lecturer grading workflows & hostel allocation"
          ]
        },
        {
          "id": "high_school",
          "typeKey": "high_school",
          "badge": "High School",
          "title": "Senior High Schools",
          "description": "Classrooms, form teachers, continuous assessment gradebooks, end-of-term report cards, and dedicated parent ward visibility.",
          "ctaLabel": "Explore High School Portal",
          "bullets": [
            "Forms, streams & subject allocations",
            "CA scores, mark sheets & report cards",
            "Guardian ward tracking & PTA messaging"
          ]
        },
        {
          "id": "vocational",
          "typeKey": "vocational",
          "badge": "Vocational",
          "title": "Vocational & Technical",
          "description": "Trade cohorts, practical workshop logs, competency-based certification, equipment checkouts, and apprentice placements.",
          "ctaLabel": "Explore Vocational Portal",
          "bullets": [
            "Trade cohorts & workshop bay scheduling",
            "Competency rubrics & practical logbooks",
            "Equipment inventory & apprentice supervision"
          ]
        }
      ]
    }$json$::jsonb,
    true
  ),
  (
    'results_spotlight',
    $json${
      "badge": "Exam Results",
      "headlineLine1": "Monitor Student",
      "headlineLine2": "Results with Ease",
      "subtitle": "Stay informed about grades, continuous assessments, and term rankings in one secure, role-scoped platform with detailed performance analytics.",
      "phoneTitle": "Exam Results",
      "phoneTerm": "Term 1",
      "rankLabel": "Class Rank",
      "rankValue": "2nd",
      "averageLabel": "Average",
      "averageValue": "92%",
      "proficiencyLabel": "Overall Proficiency",
      "proficiencyValue": "95%",
      "highlights": [
        {
          "title": "Instant Result Access",
          "description": "Check approved exam results immediately with subject breakdowns, moderation logs, and cumulative GPA.",
          "icon": "check-circle"
        },
        {
          "title": "Performance Insights",
          "description": "Track term-over-term progress across departments, classes, and academic cohorts for faster intervention.",
          "icon": "trending-up"
        }
      ]
    }$json$::jsonb,
    true
  ),
  (
    'about_stats',
    $json${
      "badge": "About Erudian360",
      "headlineLine1": "Empowering Schools with",
      "headlineLine2": "Smart Management",
      "description": "Simplify campus operations with one unified multi-tenant platform for academics, attendance, bursary billing, parent communication, and institutional analytics built to elevate outcomes.",
      "ctaLabel": "Request Demo",
      "ctaModule": "Multi-Tenant Governance",
      "imageUrl": "/images/classroom-showcase.png",
      "imageAlt": "Teacher leading diverse engaged students inside a sunlit modern classroom powered by Erudian360",
      "stats": [
        { "value": "10,000+", "label": "Students Managed" },
        { "value": "500+", "label": "Teachers Connected" },
        { "value": "100+", "label": "Schools & Campuses" }
      ]
    }$json$::jsonb,
    true
  ),
  (
    'pricing',
    $json${
      "badge": "Pricing Plans",
      "headlineLine1": "Simple, Transparent Pricing",
      "headlineLine2": "for Every Institution",
      "subtitle": "Scale effortlessly from single-campus schools to multi-campus university networks with strict multi-tenant isolation and zero hidden fees.",
      "monthlyLabel": "Monthly",
      "annualLabel": "Annual",
      "annualBadge": "Save 20%",
      "trustNote": "Every plan includes strict school-level data isolation, automated encrypted backups, and zero setup surprises.",
      "trustActionLabel": "Need a tailored quote? Chat with Sales",
      "tiers": [
        {
          "id": "starter",
          "name": "Starter",
          "badge": "High Schools & Vocational",
          "audienceSubtitle": "",
          "description": "Essential academic, attendance, and bursary workflows for growing single-campus schools.",
          "monthlyPrice": "$249",
          "annualPrice": "$199",
          "customPriceLabel": "",
          "annualBillingNote": "Billed annually ($2,388/yr)",
          "monthlyBillingNote": "Billed monthly · Cancel anytime",
          "highlighted": false,
          "ctaLabel": "Request Demo",
          "ctaAction": "demo",
          "features": [
            "Up to 500 active students & 50 staff accounts",
            "Dynamic academic structure (Classes or Trades)",
            "Daily attendance tracking & absence alerts",
            "Exam grading, report cards & parent portal",
            "Fee invoicing, receipts & bursar workspace",
            "Email support & guided campus onboarding"
          ]
        },
        {
          "id": "professional",
          "name": "Professional",
          "badge": "Most Popular",
          "audienceSubtitle": "Universities, Colleges & Growing Schools",
          "description": "Complete academic governance, finance automation, and role-scoped portals built for full institutions.",
          "monthlyPrice": "$625",
          "annualPrice": "$499",
          "customPriceLabel": "",
          "annualBillingNote": "Billed annually ($5,988/yr)",
          "monthlyBillingNote": "Billed monthly · Cancel anytime",
          "highlighted": true,
          "ctaLabel": "Request Demo",
          "ctaAction": "demo",
          "features": [
            "Up to 2,500 active students & unlimited staff",
            "Full Departments, Programs & GPA transcripts",
            "Automated fee schedules & live bursar analytics",
            "Role-scoped Admin, Finance, Staff, Parent & Student portals",
            "Admissions pipelines & timetable management",
            "Real-time KPI dashboards & institutional reports",
            "Priority support & dedicated onboarding specialist"
          ]
        },
        {
          "id": "enterprise",
          "name": "Enterprise",
          "badge": "Multi-Campus & Large Unis",
          "audienceSubtitle": "",
          "description": "Dedicated multi-tenant infrastructure, cross-campus governance, and custom integrations at scale.",
          "monthlyPrice": "Custom",
          "annualPrice": "Custom",
          "customPriceLabel": "Custom",
          "annualBillingNote": "Tailored to campus count & student volume",
          "monthlyBillingNote": "Tailored to campus count & student volume",
          "highlighted": false,
          "ctaLabel": "Chat with Sales",
          "ctaAction": "sales",
          "features": [
            "Unlimited students, staff & campus tenants",
            "Super Admin cross-tenant governance console",
            "Custom branding, domain & SSO authentication",
            "Strict RLS tenant isolation & compliance audits",
            "Legacy data migration & custom API access",
            "Payment gateway & ERP billing integrations",
            "24/7 SLA, account manager & on-site training"
          ]
        }
      ]
    }$json$::jsonb,
    true
  ),
  (
    'testimonials',
    $json${
      "badge": "Customer Reviews",
      "headlineLine1": "See Why Schools Love",
      "headlineLine2": "Erudian360 Today",
      "subtitle": "Trusted by principals, registrars, bursars, and academic leaders across 100+ campuses.",
      "items": [
        {
          "name": "Daniel Addo",
          "role": "School Principal",
          "quote": "Erudian360 has transformed how we manage attendance, academics, and parent communication across every grade.",
          "source": "Capterra",
          "initials": "DA",
          "avatarBg": "bg-indigo-100 text-indigo-700"
        },
        {
          "name": "Michael Brown",
          "role": "IT Administrator",
          "quote": "The dashboard is intuitive, fast, and reliable. Multi-campus governance takes minutes instead of hours every week.",
          "source": "Trustpilot",
          "initials": "MB",
          "avatarBg": "bg-emerald-100 text-emerald-700"
        },
        {
          "name": "Grace Mensah",
          "role": "Vice Principal",
          "quote": "Result publishing, attendance alerts, and fee tracking all live in one unified portal that our entire staff loves.",
          "source": "G2",
          "initials": "GM",
          "avatarBg": "bg-purple-100 text-purple-700"
        },
        {
          "name": "Emily Carter",
          "role": "Academic Coordinator",
          "quote": "Managing student grades, classes, and reports used to take all weekend. Erudian360 handles it effortlessly.",
          "source": "Trustpilot",
          "initials": "EC",
          "avatarBg": "bg-rose-100 text-rose-700"
        },
        {
          "name": "Olivia Wilson",
          "role": "Dean of Studies",
          "quote": "Whether university programs or high school classes, Erudian360 adapts seamlessly to each campus workflow.",
          "source": "G2",
          "initials": "OW",
          "avatarBg": "bg-sky-100 text-sky-700"
        },
        {
          "name": "Samuel Boateng",
          "role": "Bursar & Finance Officer",
          "quote": "Automated invoicing, receipts, and bursar analytics have eliminated manual reconciliation errors completely.",
          "source": "Trustpilot",
          "initials": "SB",
          "avatarBg": "bg-teal-100 text-teal-700"
        }
      ]
    }$json$::jsonb,
    true
  ),
  (
    'faq',
    $json${
      "badge": "Frequently Asked Questions",
      "headlineLine1": "Answers for School",
      "headlineLine2": "Leaders & IT Teams",
      "subtitle": "Clear details on security, onboarding, multi-campus scaling, and day-to-day workflows.",
      "items": [
        {
          "question": "How is student and financial data isolated between schools?",
          "answer": "Every school operates as a strictly isolated tenant with database Row-Level Security (RLS) keyed on school_id. Users, invoices, grades, and files of one institution are never accessible to another."
        },
        {
          "question": "Does Erudian360 adapt to Universities, High Schools, and Vocational schools?",
          "answer": "Yes. Each institution selects its school_type, which automatically customizes navigation menus, student creation forms, grading terminology, and portals without sacrificing unified platform management."
        },
        {
          "question": "Can we toggle individual portals or modules on and off?",
          "answer": "Yes. Through the Super Admin Feature Flags console, administrators can enable or restrict specific portals (Student, Parent, Bursar, Teacher, Lecturer) globally or per school."
        },
        {
          "question": "Can we import existing student, staff, and fee records?",
          "answer": "Yes. Our onboarding specialists and built-in import tools help migrate student rosters, academic structures, and historical balances cleanly before launch."
        },
        {
          "question": "How fast can our campus go live?",
          "answer": "Single-campus high schools and vocational centers typically launch within 48 hours, while multi-campus university deployments are onboarded with dedicated guidance inside 1–2 weeks."
        }
      ]
    }$json$::jsonb,
    true
  ),
  (
    'cta_banner',
    $json${
      "headlineLine1": "Trusted Schools",
      "headlineLine2": "& Students In",
      "headlineLine3": "One Place",
      "subtitle": "Erudian360 helps institutions unify departments, classes, attendance, billing, and student outcomes from day one.",
      "primaryCtaLabel": "Request Demo",
      "secondaryCtaLabel": "Chat with Sales"
    }$json$::jsonb,
    true
  ),
  (
    'footer',
    $json${
      "description": "Empowering schools, colleges, and universities with an all-in-one multi-tenant platform for admissions, academics, finance, and campus administration.",
      "email": "hello@erudian360.com",
      "phone": "",
      "address": "",
      "productHeading": "Product",
      "productLinks": [
        { "label": "Features", "href": "#features", "action": "link" },
        { "label": "Pricing", "href": "#pricing", "action": "link" },
        { "label": "Request Demo", "href": "", "action": "demo" },
        { "label": "Chat with Sales", "href": "", "action": "sales" },
        { "label": "Reviews", "href": "#reviews", "action": "link" }
      ],
      "resourcesHeading": "Resources",
      "resourcesLinks": [
        { "label": "Portal Sign In", "href": "/login", "action": "link" },
        { "label": "About Erudian360", "href": "#about", "action": "link" },
        { "label": "Multi-Campus Pricing", "href": "", "action": "sales" },
        { "label": "Help Center & Onboarding", "href": "", "action": "demo", "demoModule": "Multi-Tenant Governance" }
      ],
      "copyright": "© 2026 Erudian360 Technologies. All rights reserved.",
      "legalLinks": [
        { "label": "Terms & Conditions", "href": "#features" },
        { "label": "Privacy Policy", "href": "#about" },
        { "label": "Sign In", "href": "/login" }
      ],
      "wordmark": "Erudian360"
    }$json$::jsonb,
    true
  )
ON CONFLICT (section_key) DO NOTHING;
