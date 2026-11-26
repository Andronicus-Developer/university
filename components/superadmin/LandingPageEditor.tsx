"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  DEFAULT_LANDING_PAGE_CONTENT,
  LANDING_SECTIONS_META,
  type FeatureIconKey,
  type FooterActionLink,
  type LandingPageContent,
  type LandingSectionKey,
  type PricingTierItem,
} from "@/lib/landing/default-content";
import {
  getLandingEditorDataAction,
  resetLandingSectionAction,
  saveLandingSectionAction,
} from "@/app/superadmin/settings/landing-actions";

const FEATURE_ICON_OPTIONS: { value: FeatureIconKey; label: string }[] = [
  { value: "users", label: "Students / Users" },
  { value: "chart", label: "Analytics / Chart" },
  { value: "credit-card", label: "Finance / Fees" },
  { value: "user-check", label: "Attendance / Check" },
  { value: "message-square", label: "Messages / Parent" },
  { value: "graduation-cap", label: "Academics / Cap" },
  { value: "calendar", label: "Timetable / Calendar" },
  { value: "book-open", label: "Courses / Book" },
  { value: "award", label: "Honors / Award" },
  { value: "sparkles", label: "Smart Highlight" },
];

const AVATAR_BG_PRESETS = [
  { value: "bg-indigo-100 text-indigo-700", label: "Indigo" },
  { value: "bg-emerald-100 text-emerald-700", label: "Emerald" },
  { value: "bg-purple-100 text-purple-700", label: "Purple" },
  { value: "bg-rose-100 text-rose-700", label: "Rose" },
  { value: "bg-sky-100 text-sky-700", label: "Sky" },
  { value: "bg-teal-100 text-teal-700", label: "Teal" },
];

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 transition-colors";

const LABEL_CLASS =
  "block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1";

function ImageUploadInput({
  label,
  value,
  onChange,
  placeholder,
  helperText,
}: {
  label: string;
  value: string;
  onChange: (nextUrl: string) => void;
  placeholder?: string;
  helperText?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "landing");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "Image upload failed.");
      }
      onChange(String(json.url));
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className={LABEL_CLASS}>{label}</label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "https://... or /images/..."}
          className={INPUT_CLASS}
        />
        <label className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors">
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          <span>{uploading ? "Uploading..." : "Upload"}</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Clear image URL"
            className="shrink-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
      {helperText && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
      {uploadError && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
          {uploadError}
        </p>
      )}
      {value && (
        <div className="inline-flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
          <img
            src={value}
            alt="Preview"
            className="h-12 w-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700 bg-white"
          />
          <span className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs truncate">
            {value}
          </span>
        </div>
      )}
    </div>
  );
}

export function LandingPageEditor() {
  const [content, setContent] = useState<LandingPageContent>(
    DEFAULT_LANDING_PAGE_CONTENT
  );
  const [updatedAtMap, setUpdatedAtMap] = useState<
    Record<LandingSectionKey, string | null>
  >({
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
    seo: null,
  });

  const [activeSection, setActiveSection] = useState<LandingSectionKey>("hero");
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const res = await getLandingEditorDataAction();
      if (!active) return;
      if (res.ok) {
        setContent(res.data.content);
        setUpdatedAtMap(res.data.updatedAtMap);
        setTableMissing(res.data.tableMissing);
      } else {
        showToast("error", res.error);
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const updateSection = <K extends LandingSectionKey>(
    key: K,
    updater: (prev: LandingPageContent[K]) => LandingPageContent[K]
  ) => {
    setContent((prev) => ({
      ...prev,
      [key]: updater(prev[key]),
    }));
  };

  const toggleSectionVisibility = (key: LandingSectionKey) => {
    setContent((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [key]: !prev.visibility[key],
      },
    }));
  };

  const handleSaveActiveSection = async () => {
    setSaving(true);
    const res = await saveLandingSectionAction({
      sectionKey: activeSection,
      sectionContent: content[activeSection],
      isVisible: content.visibility[activeSection],
    });
    setSaving(false);

    if (res.ok) {
      setContent((prev) => ({
        ...prev,
        [activeSection]: res.data.sectionContent,
        visibility: {
          ...prev.visibility,
          [activeSection]: res.data.isVisible,
        },
      }));
      setUpdatedAtMap((prev) => ({
        ...prev,
        [activeSection]: res.data.updatedAt,
      }));
      setTableMissing(false);
      const meta = LANDING_SECTIONS_META.find((m) => m.key === activeSection);
      showToast(
        "success",
        `${meta?.label || "Section"} saved and published to live landing page.`
      );
    } else {
      showToast("error", res.error);
    }
  };

  const handleResetActiveSection = async () => {
    setResetting(true);
    const res = await resetLandingSectionAction({
      sectionKey: activeSection,
    });
    setResetting(false);
    setConfirmResetOpen(false);

    if (res.ok) {
      setContent((prev) => ({
        ...prev,
        [activeSection]: res.data.sectionContent,
        visibility: {
          ...prev.visibility,
          [activeSection]: res.data.isVisible,
        },
      }));
      setUpdatedAtMap((prev) => ({
        ...prev,
        [activeSection]: res.data.updatedAt,
      }));
      const meta = LANDING_SECTIONS_META.find((m) => m.key === activeSection);
      showToast("success", `${meta?.label || "Section"} restored to defaults.`);
    } else {
      showToast("error", res.error);
    }
  };

  const currentMeta =
    LANDING_SECTIONS_META.find((m) => m.key === activeSection) ||
    LANDING_SECTIONS_META[0];
  const isSectionVisible = content.visibility[activeSection] !== false;
  const lastUpdated = updatedAtMap[activeSection];

  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Loading landing page CMS configuration...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#5B21B6] via-[#6D28D9] to-[#4338CA] text-white shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-[10px] font-bold uppercase tracking-wider">
            <Globe className="h-3 w-3" />
            <span>Public Landing Page CMS</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            Dynamic Landing Page Content Editor
          </h2>
          <p className="text-xs text-purple-100 leading-relaxed">
            Edit headlines, calls-to-action, features, school types, pricing
            tiers, testimonials, FAQs, images, and footer links. Changes publish
            directly to{" "}
            <code className="px-1.5 py-0.5 rounded bg-black/25 text-white font-mono">
              /
            </code>
            .
          </p>
        </div>

        <a
          href={`/${currentMeta.anchor === "#home" ? "" : currentMeta.anchor}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-purple-50 text-xs font-bold shadow-md transition-all"
        >
          <span>Preview Live Landing Page</span>
          <ExternalLink className="h-3.5 w-3.5 text-[#7C3AED]" />
        </a>
      </div>

      {/* Migration Notice if table missing */}
      {tableMissing && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-bold">
              Database table `public.landing_page_content` not yet created
            </div>
            <p className="leading-relaxed">
              Showing default seeded landing content. Run{" "}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono">
                supabase/migrations/20261124000005_landing_page_content.sql
              </code>{" "}
              in your Supabase SQL Editor before saving edits.
            </p>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Split Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Section Sub-Tabs Sidebar */}
        <aside className="lg:col-span-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 shadow-2xs">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Landing Sections ({LANDING_SECTIONS_META.length})
          </div>
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {LANDING_SECTIONS_META.map((sec) => {
              const active = activeSection === sec.key;
              const visible = content.visibility[sec.key] !== false;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => {
                    setActiveSection(sec.key);
                    setConfirmResetOpen(false);
                  }}
                  className={`shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    active
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{sec.label}</span>
                  <span
                    title={visible ? "Visible" : "Hidden"}
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      visible
                        ? active
                          ? "bg-emerald-300"
                          : "bg-emerald-500"
                        : active
                        ? "bg-white/40"
                        : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Active Section Form Panel */}
        <div className="lg:col-span-9 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          {/* Panel Header & Action Buttons */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentMeta.label}
                </h3>
                <button
                  type="button"
                  onClick={() => toggleSectionVisibility(activeSection)}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                    isSectionVisible
                      ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {isSectionVisible ? (
                    <>
                      <Eye className="h-3 w-3" />
                      <span>Visible on Site</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3" />
                      <span>Hidden</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentMeta.description}
              </p>
              {lastUpdated && (
                <p className="text-[10px] text-slate-400">
                  Last saved: {new Date(lastUpdated).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {confirmResetOpen ? (
                <div className="inline-flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl px-2.5 py-1.5">
                  <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                    Restore defaults?
                  </span>
                  <button
                    type="button"
                    onClick={handleResetActiveSection}
                    disabled={resetting}
                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    {resetting ? "..." : "Yes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(false)}
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(true)}
                  disabled={saving || resetting}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Section to Default</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveActiveSection}
                disabled={saving || resetting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>{saving ? "Saving..." : "Save Section"}</span>
              </button>
            </div>
          </div>

          {/* Section Specific Editors */}
          <div className="p-5 space-y-5">
            {/* 1. NAVBAR */}
            {activeSection === "navbar" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Brand Name Primary</label>
                    <input
                      type="text"
                      value={content.navbar.brandPrimary}
                      onChange={(e) =>
                        updateSection("navbar", (s) => ({
                          ...s,
                          brandPrimary: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Brand Name Accent</label>
                    <input
                      type="text"
                      value={content.navbar.brandAccent}
                      onChange={(e) =>
                        updateSection("navbar", (s) => ({
                          ...s,
                          brandAccent: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Sign In Button Label</label>
                    <input
                      type="text"
                      value={content.navbar.signInLabel}
                      onChange={(e) =>
                        updateSection("navbar", (s) => ({
                          ...s,
                          signInLabel: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Primary CTA Button Label</label>
                    <input
                      type="text"
                      value={content.navbar.ctaLabel}
                      onChange={(e) =>
                        updateSection("navbar", (s) => ({
                          ...s,
                          ctaLabel: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <ImageUploadInput
                  label="Custom Navbar Logo URL (optional)"
                  value={content.navbar.logoUrl}
                  onChange={(url) =>
                    updateSection("navbar", (s) => ({ ...s, logoUrl: url }))
                  }
                  placeholder="Leave blank to use default Erudian360 emblem"
                  helperText="Upload a PNG/WEBP logo (up to 5 MB) or paste a URL. Leave blank for the default SVG prism emblem."
                />

                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className={LABEL_CLASS}>Navigation Links</label>
                    <button
                      type="button"
                      onClick={() =>
                        updateSection("navbar", (s) => ({
                          ...s,
                          navLinks: [
                            ...s.navLinks,
                            { label: "New Link", href: "#features" },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Link</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {content.navbar.navLinks.map((lnk, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-center"
                      >
                        <input
                          type="text"
                          value={lnk.label}
                          onChange={(e) =>
                            updateSection("navbar", (s) => {
                              const next = [...s.navLinks];
                              next[idx] = { ...next[idx], label: e.target.value };
                              return { ...s, navLinks: next };
                            })
                          }
                          placeholder="Label"
                          className={`${INPUT_CLASS} col-span-5`}
                        />
                        <input
                          type="text"
                          value={lnk.href}
                          onChange={(e) =>
                            updateSection("navbar", (s) => {
                              const next = [...s.navLinks];
                              next[idx] = { ...next[idx], href: e.target.value };
                              return { ...s, navLinks: next };
                            })
                          }
                          placeholder="#pricing or /login"
                          className={`${INPUT_CLASS} col-span-6`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSection("navbar", (s) => ({
                              ...s,
                              navLinks: s.navLinks.filter((_, i) => i !== idx),
                            }))
                          }
                          className="col-span-1 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Remove link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. HERO */}
            {activeSection === "hero" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 1</label>
                    <input
                      type="text"
                      value={content.hero.headlineLine1}
                      onChange={(e) =>
                        updateSection("hero", (s) => ({
                          ...s,
                          headlineLine1: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 2</label>
                    <input
                      type="text"
                      value={content.hero.headlineLine2}
                      onChange={(e) =>
                        updateSection("hero", (s) => ({
                          ...s,
                          headlineLine2: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Subheading Description</label>
                  <textarea
                    rows={3}
                    value={content.hero.subheading}
                    onChange={(e) =>
                      updateSection("hero", (s) => ({
                        ...s,
                        subheading: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Primary CTA Label</label>
                    <input
                      type="text"
                      value={content.hero.primaryCtaLabel}
                      onChange={(e) =>
                        updateSection("hero", (s) => ({
                          ...s,
                          primaryCtaLabel: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Secondary CTA Label</label>
                    <input
                      type="text"
                      value={content.hero.secondaryCtaLabel}
                      onChange={(e) =>
                        updateSection("hero", (s) => ({
                          ...s,
                          secondaryCtaLabel: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <ImageUploadInput
                  label="Custom Hero Showcase Image (optional)"
                  value={content.hero.heroImageUrl}
                  onChange={(url) =>
                    updateSection("hero", (s) => ({ ...s, heroImageUrl: url }))
                  }
                  placeholder="Leave blank to keep interactive 3-phone showcase"
                  helperText="Optional. When left blank, visitors see the interactive Erudian360 3-phone mockup and floating summary cards."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className={LABEL_CLASS}>Summary Card Title</label>
                    <input
                      type="text"
                      value={content.hero.summaryTitle}
                      onChange={(e) =>
                        updateSection("hero", (s) => ({
                          ...s,
                          summaryTitle: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Metric 1 Label / Value</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={content.hero.attendanceLabel}
                        onChange={(e) =>
                          updateSection("hero", (s) => ({
                            ...s,
                            attendanceLabel: e.target.value,
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                      <input
                        type="text"
                        value={content.hero.attendanceValue}
                        onChange={(e) =>
                          updateSection("hero", (s) => ({
                            ...s,
                            attendanceValue: e.target.value,
                          }))
                        }
                        className={`${INPUT_CLASS} max-w-[85px]`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Metric 2 Label / Value</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={content.hero.feeCollectionLabel}
                        onChange={(e) =>
                          updateSection("hero", (s) => ({
                            ...s,
                            feeCollectionLabel: e.target.value,
                          }))
                        }
                        className={INPUT_CLASS}
                      />
                      <input
                        type="text"
                        value={content.hero.feeCollectionValue}
                        onChange={(e) =>
                          updateSection("hero", (s) => ({
                            ...s,
                            feeCollectionValue: e.target.value,
                          }))
                        }
                        className={`${INPUT_CLASS} max-w-[85px]`}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className={LABEL_CLASS}>Floating Left Alert Badges</label>
                    <button
                      type="button"
                      onClick={() =>
                        updateSection("hero", (s) => ({
                          ...s,
                          alertBadges: [
                            ...s.alertBadges,
                            { label: "New Metric", value: "99%", tone: "purple" },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Badge</span>
                    </button>
                  </div>
                  {content.hero.alertBadges.map((b, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={b.label}
                        onChange={(e) =>
                          updateSection("hero", (s) => {
                            const next = [...s.alertBadges];
                            next[idx] = { ...next[idx], label: e.target.value };
                            return { ...s, alertBadges: next };
                          })
                        }
                        className={`${INPUT_CLASS} col-span-6`}
                      />
                      <input
                        type="text"
                        value={b.value}
                        onChange={(e) =>
                          updateSection("hero", (s) => {
                            const next = [...s.alertBadges];
                            next[idx] = { ...next[idx], value: e.target.value };
                            return { ...s, alertBadges: next };
                          })
                        }
                        className={`${INPUT_CLASS} col-span-3`}
                      />
                      <select
                        value={b.tone}
                        onChange={(e) =>
                          updateSection("hero", (s) => {
                            const next = [...s.alertBadges];
                            next[idx] = {
                              ...next[idx],
                              tone: e.target.value as "purple" | "sky" | "emerald",
                            };
                            return { ...s, alertBadges: next };
                          })
                        }
                        className={`${INPUT_CLASS} col-span-2`}
                      >
                        <option value="purple">Purple</option>
                        <option value="sky">Sky</option>
                        <option value="emerald">Emerald</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          updateSection("hero", (s) => ({
                            ...s,
                            alertBadges: s.alertBadges.filter((_, i) => i !== idx),
                          }))
                        }
                        className="col-span-1 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. FEATURES */}
            {activeSection === "features" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 1</label>
                    <input
                      type="text"
                      value={content.features.headlineLine1}
                      onChange={(e) =>
                        updateSection("features", (s) => ({
                          ...s,
                          headlineLine1: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 2</label>
                    <input
                      type="text"
                      value={content.features.headlineLine2}
                      onChange={(e) =>
                        updateSection("features", (s) => ({
                          ...s,
                          headlineLine2: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Section Subtitle</label>
                  <textarea
                    rows={2}
                    value={content.features.subtitle}
                    onChange={(e) =>
                      updateSection("features", (s) => ({
                        ...s,
                        subtitle: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Phone Mockup Title</label>
                    <input
                      type="text"
                      value={content.features.phoneCardTitle}
                      onChange={(e) =>
                        updateSection("features", (s) => ({
                          ...s,
                          phoneCardTitle: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Phone Mockup Badge</label>
                    <input
                      type="text"
                      value={content.features.phoneCardBadge}
                      onChange={(e) =>
                        updateSection("features", (s) => ({
                          ...s,
                          phoneCardBadge: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Bottom Pill CTA</label>
                    <input
                      type="text"
                      value={content.features.bottomCtaLabel}
                      onChange={(e) =>
                        updateSection("features", (s) => ({
                          ...s,
                          bottomCtaLabel: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className={LABEL_CLASS}>
                      Feature Cards ({content.features.items.length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateSection("features", (s) => ({
                          ...s,
                          items: [
                            ...s.items,
                            {
                              id: `feature-${Date.now()}`,
                              title: "New Capability",
                              description: "Describe how this capability empowers campuses.",
                              demoModule: "Student Management",
                              icon: "sparkles",
                            },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Feature Card</span>
                    </button>
                  </div>

                  {content.features.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Feature #{idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSection("features", (s) => {
                                  const next = [...s.items];
                                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                  return { ...s, items: next };
                                })
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {idx < content.features.items.length - 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSection("features", (s) => {
                                  const next = [...s.items];
                                  [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                  return { ...s, items: next };
                                })
                              }
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              updateSection("features", (s) => ({
                                ...s,
                                items: s.items.filter((_, i) => i !== idx),
                              }))
                            }
                            className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={LABEL_CLASS}>Title</label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) =>
                              updateSection("features", (s) => {
                                const next = [...s.items];
                                next[idx] = { ...next[idx], title: e.target.value };
                                return { ...s, items: next };
                              })
                            }
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Icon</label>
                          <select
                            value={item.icon}
                            onChange={(e) =>
                              updateSection("features", (s) => {
                                const next = [...s.items];
                                next[idx] = {
                                  ...next[idx],
                                  icon: e.target.value as FeatureIconKey,
                                };
                                return { ...s, items: next };
                              })
                            }
                            className={INPUT_CLASS}
                          >
                            {FEATURE_ICON_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Demo Interest Tag</label>
                          <input
                            type="text"
                            value={item.demoModule}
                            onChange={(e) =>
                              updateSection("features", (s) => {
                                const next = [...s.items];
                                next[idx] = {
                                  ...next[idx],
                                  demoModule: e.target.value,
                                };
                                return { ...s, items: next };
                              })
                            }
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={LABEL_CLASS}>Description</label>
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) =>
                            updateSection("features", (s) => {
                              const next = [...s.items];
                              next[idx] = {
                                ...next[idx],
                                description: e.target.value,
                              };
                              return { ...s, items: next };
                            })
                          }
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. SCHOOL TYPES */}
            {activeSection === "school_types" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Section Badge</label>
                    <input
                      type="text"
                      value={content.school_types.badge}
                      onChange={(e) =>
                        updateSection("school_types", (s) => ({
                          ...s,
                          badge: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 1</label>
                    <input
                      type="text"
                      value={content.school_types.headlineLine1}
                      onChange={(e) =>
                        updateSection("school_types", (s) => ({
                          ...s,
                          headlineLine1: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 2</label>
                    <input
                      type="text"
                      value={content.school_types.headlineLine2}
                      onChange={(e) =>
                        updateSection("school_types", (s) => ({
                          ...s,
                          headlineLine2: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Subtitle</label>
                  <textarea
                    rows={2}
                    value={content.school_types.subtitle}
                    onChange={(e) =>
                      updateSection("school_types", (s) => ({
                        ...s,
                        subtitle: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {content.school_types.items.map((st, idx) => (
                    <div
                      key={st.id || idx}
                      className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={LABEL_CLASS}>Title</label>
                          <input
                            type="text"
                            value={st.title}
                            onChange={(e) =>
                              updateSection("school_types", (s) => {
                                const next = [...s.items];
                                next[idx] = { ...next[idx], title: e.target.value };
                                return { ...s, items: next };
                              })
                            }
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Pill Badge</label>
                          <input
                            type="text"
                            value={st.badge}
                            onChange={(e) =>
                              updateSection("school_types", (s) => {
                                const next = [...s.items];
                                next[idx] = { ...next[idx], badge: e.target.value };
                                return { ...s, items: next };
                              })
                            }
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Button Label</label>
                          <input
                            type="text"
                            value={st.ctaLabel}
                            onChange={(e) =>
                              updateSection("school_types", (s) => {
                                const next = [...s.items];
                                next[idx] = { ...next[idx], ctaLabel: e.target.value };
                                return { ...s, items: next };
                              })
                            }
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={LABEL_CLASS}>Description</label>
                        <textarea
                          rows={2}
                          value={st.description}
                          onChange={(e) =>
                            updateSection("school_types", (s) => {
                              const next = [...s.items];
                              next[idx] = {
                                ...next[idx],
                                description: e.target.value,
                              };
                              return { ...s, items: next };
                            })
                          }
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLASS}>
                          Highlight Bullets (one per line)
                        </label>
                        <textarea
                          rows={3}
                          value={(st.bullets || []).join("\n")}
                          onChange={(e) =>
                            updateSection("school_types", (s) => {
                              const next = [...s.items];
                              next[idx] = {
                                ...next[idx],
                                bullets: e.target.value
                                  .split("\n")
                                  .map((line) => line.trim())
                                  .filter(Boolean),
                              };
                              return { ...s, items: next };
                            })
                          }
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. RESULTS SPOTLIGHT */}
            {activeSection === "results_spotlight" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Badge</label>
                    <input
                      type="text"
                      value={content.results_spotlight.badge}
                      onChange={(e) =>
                        updateSection("results_spotlight", (s) => ({
                          ...s,
                          badge: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 1</label>
                    <input
                      type="text"
                      value={content.results_spotlight.headlineLine1}
                      onChange={(e) =>
                        updateSection("results_spotlight", (s) => ({
                          ...s,
                          headlineLine1: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 2</label>
                    <input
                      type="text"
                      value={content.results_spotlight.headlineLine2}
                      onChange={(e) =>
                        updateSection("results_spotlight", (s) => ({
                          ...s,
                          headlineLine2: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Subtitle</label>
                  <textarea
                    rows={2}
                    value={content.results_spotlight.subtitle}
                    onChange={(e) =>
                      updateSection("results_spotlight", (s) => ({
                        ...s,
                        subtitle: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className={LABEL_CLASS}>Phone Title</label>
                    <input
                      type="text"
                      value={content.results_spotlight.phoneTitle}
                      onChange={(e) =>
                        updateSection("results_spotlight", (s) => ({
                          ...s,
                          phoneTitle: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Term Badge</label>
                    <input
                      type="text"
                      value={content.results_spotlight.phoneTerm}
                      onChange={(e) =>
                        updateSection("results_spotlight", (s) => ({
                          ...s,
                          phoneTerm: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Rank Value</label>
                    <input
                      type="text"
                      value={content.results_spotlight.rankValue}
                      onChange={(e) =>
                        updateSection("results_spotlight", (s) => ({
                          ...s,
                          rankValue: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Proficiency Value</label>
                    <input
                      type="text"
                      value={content.results_spotlight.proficiencyValue}
                      onChange={(e) =>
                        updateSection("results_spotlight", (s) => ({
                          ...s,
                          proficiencyValue: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className={LABEL_CLASS}>Highlight Bullet Points</label>
                  {content.results_spotlight.highlights.map((hl, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2"
                    >
                      <input
                        type="text"
                        value={hl.title}
                        onChange={(e) =>
                          updateSection("results_spotlight", (s) => {
                            const next = [...s.highlights];
                            next[idx] = { ...next[idx], title: e.target.value };
                            return { ...s, highlights: next };
                          })
                        }
                        className={INPUT_CLASS}
                      />
                      <textarea
                        rows={2}
                        value={hl.description}
                        onChange={(e) =>
                          updateSection("results_spotlight", (s) => {
                            const next = [...s.highlights];
                            next[idx] = {
                              ...next[idx],
                              description: e.target.value,
                            };
                            return { ...s, highlights: next };
                          })
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. ABOUT & STATS */}
            {activeSection === "about_stats" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Section Badge</label>
                    <input
                      type="text"
                      value={content.about_stats.badge}
                      onChange={(e) =>
                        updateSection("about_stats", (s) => ({
                          ...s,
                          badge: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 1</label>
                    <input
                      type="text"
                      value={content.about_stats.headlineLine1}
                      onChange={(e) =>
                        updateSection("about_stats", (s) => ({
                          ...s,
                          headlineLine1: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 2</label>
                    <input
                      type="text"
                      value={content.about_stats.headlineLine2}
                      onChange={(e) =>
                        updateSection("about_stats", (s) => ({
                          ...s,
                          headlineLine2: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Description Copy</label>
                  <textarea
                    rows={3}
                    value={content.about_stats.description}
                    onChange={(e) =>
                      updateSection("about_stats", (s) => ({
                        ...s,
                        description: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>CTA Button Label</label>
                    <input
                      type="text"
                      value={content.about_stats.ctaLabel}
                      onChange={(e) =>
                        updateSection("about_stats", (s) => ({
                          ...s,
                          ctaLabel: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Showcase Image Alt Text</label>
                    <input
                      type="text"
                      value={content.about_stats.imageAlt}
                      onChange={(e) =>
                        updateSection("about_stats", (s) => ({
                          ...s,
                          imageAlt: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <ImageUploadInput
                  label="Showcase Photograph URL"
                  value={content.about_stats.imageUrl}
                  onChange={(url) =>
                    updateSection("about_stats", (s) => ({
                      ...s,
                      imageUrl: url || "/images/classroom-showcase.png",
                    }))
                  }
                  placeholder="/images/classroom-showcase.png"
                />

                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className={LABEL_CLASS}>
                      Overlapping Trusted Stats ({content.about_stats.stats.length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateSection("about_stats", (s) => ({
                          ...s,
                          stats: [
                            ...s.stats,
                            { value: "99.9%", label: "Uptime SLA" },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Stat</span>
                    </button>
                  </div>
                  {content.about_stats.stats.map((st, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={st.value}
                        onChange={(e) =>
                          updateSection("about_stats", (s) => {
                            const next = [...s.stats];
                            next[idx] = { ...next[idx], value: e.target.value };
                            return { ...s, stats: next };
                          })
                        }
                        placeholder="10,000+"
                        className={`${INPUT_CLASS} col-span-4`}
                      />
                      <input
                        type="text"
                        value={st.label}
                        onChange={(e) =>
                          updateSection("about_stats", (s) => {
                            const next = [...s.stats];
                            next[idx] = { ...next[idx], label: e.target.value };
                            return { ...s, stats: next };
                          })
                        }
                        placeholder="Students Managed"
                        className={`${INPUT_CLASS} col-span-7`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateSection("about_stats", (s) => ({
                            ...s,
                            stats: s.stats.filter((_, i) => i !== idx),
                          }))
                        }
                        className="col-span-1 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. PRICING */}
            {activeSection === "pricing" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Section Badge</label>
                    <input
                      type="text"
                      value={content.pricing.badge}
                      onChange={(e) =>
                        updateSection("pricing", (s) => ({
                          ...s,
                          badge: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 1</label>
                    <input
                      type="text"
                      value={content.pricing.headlineLine1}
                      onChange={(e) =>
                        updateSection("pricing", (s) => ({
                          ...s,
                          headlineLine1: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 2</label>
                    <input
                      type="text"
                      value={content.pricing.headlineLine2}
                      onChange={(e) =>
                        updateSection("pricing", (s) => ({
                          ...s,
                          headlineLine2: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Section Subtitle</label>
                  <textarea
                    rows={2}
                    value={content.pricing.subtitle}
                    onChange={(e) =>
                      updateSection("pricing", (s) => ({
                        ...s,
                        subtitle: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Monthly Label</label>
                    <input
                      type="text"
                      value={content.pricing.monthlyLabel}
                      onChange={(e) =>
                        updateSection("pricing", (s) => ({
                          ...s,
                          monthlyLabel: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Annual Label</label>
                    <input
                      type="text"
                      value={content.pricing.annualLabel}
                      onChange={(e) =>
                        updateSection("pricing", (s) => ({
                          ...s,
                          annualLabel: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Annual Discount Pill</label>
                    <input
                      type="text"
                      value={content.pricing.annualBadge}
                      onChange={(e) =>
                        updateSection("pricing", (s) => ({
                          ...s,
                          annualBadge: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className={LABEL_CLASS}>
                      Pricing Tiers ({content.pricing.tiers.length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateSection("pricing", (s) => ({
                          ...s,
                          tiers: [
                            ...s.tiers,
                            {
                              id: `tier-${Date.now()}`,
                              name: "Growth",
                              badge: "New Plan",
                              audienceSubtitle: "",
                              description: "Flexible pricing for expanding institutions.",
                              monthlyPrice: "$399",
                              annualPrice: "$319",
                              customPriceLabel: "",
                              annualBillingNote: "Billed annually",
                              monthlyBillingNote: "Billed monthly",
                              highlighted: false,
                              ctaLabel: "Request Demo",
                              ctaAction: "demo",
                              features: ["Multi-tenant isolation", "Live dashboards"],
                            } satisfies PricingTierItem,
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Tier</span>
                    </button>
                  </div>

                  {content.pricing.tiers.map((tier, idx) => (
                    <div
                      key={tier.id || idx}
                      className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Tier #{idx + 1}: {tier.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tier.highlighted}
                              onChange={(e) =>
                                updateSection("pricing", (s) => {
                                  const next = [...s.tiers];
                                  next[idx] = {
                                    ...next[idx],
                                    highlighted: e.target.checked,
                                  };
                                  return { ...s, tiers: next };
                                })
                              }
                            />
                            <span>Highlight Card</span>
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              updateSection("pricing", (s) => ({
                                ...s,
                                tiers: s.tiers.filter((_, i) => i !== idx),
                              }))
                            }
                            className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className={LABEL_CLASS}>Tier Name</label>
                          <input
                            type="text"
                            value={tier.name}
                            onChange={(e) =>
                              updateSection("pricing", (s) => {
                                const next = [...s.tiers];
                                next[idx] = { ...next[idx], name: e.target.value };
                                return { ...s, tiers: next };
                              })
                            }
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Badge</label>
                          <input
                            type="text"
                            value={tier.badge}
                            onChange={(e) =>
                              updateSection("pricing", (s) => {
                                const next = [...s.tiers];
                                next[idx] = { ...next[idx], badge: e.target.value };
                                return { ...s, tiers: next };
                              })
                            }
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>CTA Action</label>
                          <select
                            value={tier.ctaAction}
                            onChange={(e) =>
                              updateSection("pricing", (s) => {
                                const next = [...s.tiers];
                                next[idx] = {
                                  ...next[idx],
                                  ctaAction: e.target.value as "demo" | "sales",
                                };
                                return { ...s, tiers: next };
                              })
                            }
                            className={INPUT_CLASS}
                          >
                            <option value="demo">Request Demo Modal</option>
                            <option value="sales">Chat with Sales Modal</option>
                          </select>
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Monthly Price</label>
                          <input
                            type="text"
                            value={tier.monthlyPrice}
                            onChange={(e) =>
                              updateSection("pricing", (s) => {
                                const next = [...s.tiers];
                                next[idx] = {
                                  ...next[idx],
                                  monthlyPrice: e.target.value,
                                };
                                return { ...s, tiers: next };
                              })
                            }
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Annual Price</label>
                          <input
                            type="text"
                            value={tier.annualPrice}
                            onChange={(e) =>
                              updateSection("pricing", (s) => {
                                const next = [...s.tiers];
                                next[idx] = {
                                  ...next[idx],
                                  annualPrice: e.target.value,
                                };
                                return { ...s, tiers: next };
                              })
                            }
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>CTA Button Text</label>
                          <input
                            type="text"
                            value={tier.ctaLabel}
                            onChange={(e) =>
                              updateSection("pricing", (s) => {
                                const next = [...s.tiers];
                                next[idx] = { ...next[idx], ctaLabel: e.target.value };
                                return { ...s, tiers: next };
                              })
                            }
                            className={INPUT_CLASS}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={LABEL_CLASS}>Description</label>
                        <input
                          type="text"
                          value={tier.description}
                          onChange={(e) =>
                            updateSection("pricing", (s) => {
                              const next = [...s.tiers];
                              next[idx] = {
                                ...next[idx],
                                description: e.target.value,
                              };
                              return { ...s, tiers: next };
                            })
                          }
                          className={INPUT_CLASS}
                        />
                      </div>

                      <div>
                        <label className={LABEL_CLASS}>
                          Included Features (one per line)
                        </label>
                        <textarea
                          rows={4}
                          value={(tier.features || []).join("\n")}
                          onChange={(e) =>
                            updateSection("pricing", (s) => {
                              const next = [...s.tiers];
                              next[idx] = {
                                ...next[idx],
                                features: e.target.value
                                  .split("\n")
                                  .map((line) => line.trim())
                                  .filter(Boolean),
                              };
                              return { ...s, tiers: next };
                            })
                          }
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. TESTIMONIALS */}
            {activeSection === "testimonials" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Section Badge</label>
                    <input
                      type="text"
                      value={content.testimonials.badge}
                      onChange={(e) =>
                        updateSection("testimonials", (s) => ({
                          ...s,
                          badge: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 1</label>
                    <input
                      type="text"
                      value={content.testimonials.headlineLine1}
                      onChange={(e) =>
                        updateSection("testimonials", (s) => ({
                          ...s,
                          headlineLine1: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 2</label>
                    <input
                      type="text"
                      value={content.testimonials.headlineLine2}
                      onChange={(e) =>
                        updateSection("testimonials", (s) => ({
                          ...s,
                          headlineLine2: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Subtitle</label>
                  <input
                    type="text"
                    value={content.testimonials.subtitle}
                    onChange={(e) =>
                      updateSection("testimonials", (s) => ({
                        ...s,
                        subtitle: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className={LABEL_CLASS}>
                      Customer Reviews ({content.testimonials.items.length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateSection("testimonials", (s) => ({
                          ...s,
                          items: [
                            ...s.items,
                            {
                              name: "Dr. Kojo Annan",
                              role: "Registrar",
                              quote:
                                "Erudian360 streamlined our admissions and term grading overnight.",
                              source: "Trustpilot",
                              initials: "KA",
                              avatarBg: "bg-indigo-100 text-indigo-700",
                            },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Review</span>
                    </button>
                  </div>

                  {content.testimonials.items.map((rev, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          Review #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateSection("testimonials", (s) => ({
                              ...s,
                              items: s.items.filter((_, i) => i !== idx),
                            }))
                          }
                          className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <input
                          type="text"
                          value={rev.name}
                          onChange={(e) =>
                            updateSection("testimonials", (s) => {
                              const next = [...s.items];
                              next[idx] = { ...next[idx], name: e.target.value };
                              return { ...s, items: next };
                            })
                          }
                          placeholder="Name"
                          className={INPUT_CLASS}
                        />
                        <input
                          type="text"
                          value={rev.role}
                          onChange={(e) =>
                            updateSection("testimonials", (s) => {
                              const next = [...s.items];
                              next[idx] = { ...next[idx], role: e.target.value };
                              return { ...s, items: next };
                            })
                          }
                          placeholder="Role"
                          className={INPUT_CLASS}
                        />
                        <select
                          value={rev.source}
                          onChange={(e) =>
                            updateSection("testimonials", (s) => {
                              const next = [...s.items];
                              next[idx] = {
                                ...next[idx],
                                source: e.target.value as
                                  | "Capterra"
                                  | "Trustpilot"
                                  | "G2",
                              };
                              return { ...s, items: next };
                            })
                          }
                          className={INPUT_CLASS}
                        >
                          <option value="Trustpilot">Trustpilot</option>
                          <option value="Capterra">Capterra</option>
                          <option value="G2">G2</option>
                        </select>
                        <select
                          value={rev.avatarBg}
                          onChange={(e) =>
                            updateSection("testimonials", (s) => {
                              const next = [...s.items];
                              next[idx] = { ...next[idx], avatarBg: e.target.value };
                              return { ...s, items: next };
                            })
                          }
                          className={INPUT_CLASS}
                        >
                          {AVATAR_BG_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <textarea
                        rows={2}
                        value={rev.quote}
                        onChange={(e) =>
                          updateSection("testimonials", (s) => {
                            const next = [...s.items];
                            next[idx] = { ...next[idx], quote: e.target.value };
                            return { ...s, items: next };
                          })
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. FAQ */}
            {activeSection === "faq" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Badge</label>
                    <input
                      type="text"
                      value={content.faq.badge}
                      onChange={(e) =>
                        updateSection("faq", (s) => ({
                          ...s,
                          badge: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 1</label>
                    <input
                      type="text"
                      value={content.faq.headlineLine1}
                      onChange={(e) =>
                        updateSection("faq", (s) => ({
                          ...s,
                          headlineLine1: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 2</label>
                    <input
                      type="text"
                      value={content.faq.headlineLine2}
                      onChange={(e) =>
                        updateSection("faq", (s) => ({
                          ...s,
                          headlineLine2: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Subtitle</label>
                  <input
                    type="text"
                    value={content.faq.subtitle}
                    onChange={(e) =>
                      updateSection("faq", (s) => ({
                        ...s,
                        subtitle: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className={LABEL_CLASS}>
                      Questions &amp; Answers ({content.faq.items.length})
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateSection("faq", (s) => ({
                          ...s,
                          items: [
                            ...s.items,
                            {
                              question: "New Frequently Asked Question?",
                              answer: "Write a clear, helpful answer here.",
                            },
                          ],
                        }))
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add FAQ</span>
                    </button>
                  </div>

                  {content.faq.items.map((f, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          FAQ #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateSection("faq", (s) => ({
                              ...s,
                              items: s.items.filter((_, i) => i !== idx),
                            }))
                          }
                          className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={f.question}
                        onChange={(e) =>
                          updateSection("faq", (s) => {
                            const next = [...s.items];
                            next[idx] = { ...next[idx], question: e.target.value };
                            return { ...s, items: next };
                          })
                        }
                        className={INPUT_CLASS}
                      />
                      <textarea
                        rows={2}
                        value={f.answer}
                        onChange={(e) =>
                          updateSection("faq", (s) => {
                            const next = [...s.items];
                            next[idx] = { ...next[idx], answer: e.target.value };
                            return { ...s, items: next };
                          })
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10. CTA BANNER */}
            {activeSection === "cta_banner" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 1</label>
                    <input
                      type="text"
                      value={content.cta_banner.headlineLine1}
                      onChange={(e) =>
                        updateSection("cta_banner", (s) => ({
                          ...s,
                          headlineLine1: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 2</label>
                    <input
                      type="text"
                      value={content.cta_banner.headlineLine2}
                      onChange={(e) =>
                        updateSection("cta_banner", (s) => ({
                          ...s,
                          headlineLine2: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Headline Line 3</label>
                    <input
                      type="text"
                      value={content.cta_banner.headlineLine3}
                      onChange={(e) =>
                        updateSection("cta_banner", (s) => ({
                          ...s,
                          headlineLine3: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Banner Subtitle</label>
                  <textarea
                    rows={2}
                    value={content.cta_banner.subtitle}
                    onChange={(e) =>
                      updateSection("cta_banner", (s) => ({
                        ...s,
                        subtitle: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Primary CTA Label</label>
                    <input
                      type="text"
                      value={content.cta_banner.primaryCtaLabel}
                      onChange={(e) =>
                        updateSection("cta_banner", (s) => ({
                          ...s,
                          primaryCtaLabel: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Secondary CTA Label</label>
                    <input
                      type="text"
                      value={content.cta_banner.secondaryCtaLabel}
                      onChange={(e) =>
                        updateSection("cta_banner", (s) => ({
                          ...s,
                          secondaryCtaLabel: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 11. FOOTER */}
            {activeSection === "footer" && (
              <div className="space-y-5">
                <div>
                  <label className={LABEL_CLASS}>Footer Brand Summary</label>
                  <textarea
                    rows={2}
                    value={content.footer.description}
                    onChange={(e) =>
                      updateSection("footer", (s) => ({
                        ...s,
                        description: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Contact Email</label>
                    <input
                      type="email"
                      value={content.footer.email}
                      onChange={(e) =>
                        updateSection("footer", (s) => ({
                          ...s,
                          email: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Phone (optional)</label>
                    <input
                      type="text"
                      value={content.footer.phone}
                      onChange={(e) =>
                        updateSection("footer", (s) => ({
                          ...s,
                          phone: e.target.value,
                        }))
                      }
                      placeholder="+233 30 000 0000"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Address (optional)</label>
                    <input
                      type="text"
                      value={content.footer.address}
                      onChange={(e) =>
                        updateSection("footer", (s) => ({
                          ...s,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Accra, Ghana"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Copyright Notice</label>
                    <input
                      type="text"
                      value={content.footer.copyright}
                      onChange={(e) =>
                        updateSection("footer", (s) => ({
                          ...s,
                          copyright: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Oversized Footer Wordmark</label>
                    <input
                      type="text"
                      value={content.footer.wordmark}
                      onChange={(e) =>
                        updateSection("footer", (s) => ({
                          ...s,
                          wordmark: e.target.value,
                        }))
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                {(
                  [
                    ["productLinks", content.footer.productHeading] as const,
                    ["resourcesLinks", content.footer.resourcesHeading] as const,
                  ]
                ).map(([colKey, heading]) => (
                  <div
                    key={colKey}
                    className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <label className={LABEL_CLASS}>{heading} Column Links</label>
                      <button
                        type="button"
                        onClick={() =>
                          updateSection("footer", (s) => ({
                            ...s,
                            [colKey]: [
                              ...s[colKey],
                              { label: "New Link", href: "#home", action: "link" },
                            ],
                          }))
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Link</span>
                      </button>
                    </div>

                    {content.footer[colKey].map((item: FooterActionLink, idx: number) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) =>
                            updateSection("footer", (s) => {
                              const next = [...s[colKey]];
                              next[idx] = { ...next[idx], label: e.target.value };
                              return { ...s, [colKey]: next };
                            })
                          }
                          placeholder="Label"
                          className={`${INPUT_CLASS} col-span-4`}
                        />
                        <select
                          value={item.action}
                          onChange={(e) =>
                            updateSection("footer", (s) => {
                              const next = [...s[colKey]];
                              next[idx] = {
                                ...next[idx],
                                action: e.target.value as "link" | "demo" | "sales",
                              };
                              return { ...s, [colKey]: next };
                            })
                          }
                          className={`${INPUT_CLASS} col-span-3`}
                        >
                          <option value="link">URL / Anchor</option>
                          <option value="demo">Demo Modal</option>
                          <option value="sales">Sales Modal</option>
                        </select>
                        <input
                          type="text"
                          value={item.href}
                          disabled={item.action !== "link"}
                          onChange={(e) =>
                            updateSection("footer", (s) => {
                              const next = [...s[colKey]];
                              next[idx] = { ...next[idx], href: e.target.value };
                              return { ...s, [colKey]: next };
                            })
                          }
                          placeholder={item.action === "link" ? "#features" : "Modal trigger"}
                          className={`${INPUT_CLASS} col-span-4 disabled:opacity-50`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateSection("footer", (s) => ({
                              ...s,
                              [colKey]: s[colKey].filter((_: any, i: number) => i !== idx),
                            }))
                          }
                          className="col-span-1 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
