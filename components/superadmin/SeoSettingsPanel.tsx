"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Search,
  Share2,
  ShieldCheck,
  Tag,
  Upload,
  X,
} from "lucide-react";
import {
  DEFAULT_LANDING_PAGE_CONTENT,
  type SeoSectionContent,
} from "@/lib/landing/default-content";
import {
  getLandingEditorDataAction,
  resetLandingSectionAction,
  saveLandingSectionAction,
} from "@/app/superadmin/settings/landing-actions";

const INPUT_CLASS =
  "w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 transition-colors";

const LABEL_CLASS =
  "block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1";

function charBadgeClass(len: number, min: number, max: number) {
  if (len === 0) return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  if (len >= min && len <= max)
    return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60";
  return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60";
}

export function SeoSettingsPanel() {
  const [seo, setSeo] = useState<SeoSectionContent>(
    DEFAULT_LANDING_PAGE_CONTENT.seo
  );
  const [keywordsInput, setKeywordsInput] = useState<string>(
    DEFAULT_LANDING_PAGE_CONTENT.seo.keywords.join(", ")
  );
  const [newTagInput, setNewTagInput] = useState("");
  const [newSocialUrl, setNewSocialUrl] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);
  const [originDisplay, setOriginDisplay] = useState("https://erudian360.com");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      setOriginDisplay(window.location.origin);
    }

    let active = true;
    async function load() {
      setLoading(true);
      const res = await getLandingEditorDataAction();
      if (!active) return;
      if (res.ok) {
        const nextSeo = res.data.content.seo || DEFAULT_LANDING_PAGE_CONTENT.seo;
        setSeo(nextSeo);
        setKeywordsInput((nextSeo.keywords || []).join(", "));
        setLastUpdated(res.data.updatedAtMap?.seo || null);
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

  const syncKeywordsFromString = (raw: string) => {
    setKeywordsInput(raw);
    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setSeo((prev) => ({ ...prev, keywords: parsed }));
  };

  const addKeywordTag = () => {
    const tag = newTagInput.trim();
    if (!tag) return;
    if (!seo.keywords.some((k) => k.toLowerCase() === tag.toLowerCase())) {
      const next = [...seo.keywords, tag];
      setSeo((prev) => ({ ...prev, keywords: next }));
      setKeywordsInput(next.join(", "));
    }
    setNewTagInput("");
  };

  const removeKeywordTag = (idx: number) => {
    const next = seo.keywords.filter((_, i) => i !== idx);
    setSeo((prev) => ({ ...prev, keywords: next }));
    setKeywordsInput(next.join(", "));
  };

  const handleOgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadingOg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "seo");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || "Image upload failed.");
      }
      setSeo((prev) => ({ ...prev, ogImageUrl: String(json.url) }));
      showToast("success", "Open Graph social image uploaded.");
    } catch (err: any) {
      showToast("error", err?.message || "Failed to upload Open Graph image.");
    } finally {
      setUploadingOg(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const cleanedKeywords = keywordsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: SeoSectionContent = {
      ...seo,
      keywords: cleanedKeywords,
      socialLinks: (seo.socialLinks || []).map((u) => u.trim()).filter(Boolean),
    };

    const res = await saveLandingSectionAction({
      sectionKey: "seo",
      sectionContent: payload,
      isVisible: true,
    });
    setSaving(false);

    if (res.ok) {
      setSeo(res.data.sectionContent);
      setKeywordsInput((res.data.sectionContent.keywords || []).join(", "));
      setLastUpdated(res.data.updatedAt);
      setTableMissing(false);
      showToast(
        "success",
        "SEO metadata saved and revalidated across /, /login, sitemap.xml, and robots.txt."
      );
    } else {
      showToast("error", res.error);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    const res = await resetLandingSectionAction({ sectionKey: "seo" });
    setResetting(false);
    if (res.ok) {
      setSeo(res.data.sectionContent);
      setKeywordsInput((res.data.sectionContent.keywords || []).join(", "));
      setLastUpdated(res.data.updatedAt);
      showToast("success", "SEO settings restored to platform defaults.");
    } else {
      showToast("error", res.error);
    }
  };

  const effectiveTitle = seo.metaTitle?.trim() || DEFAULT_LANDING_PAGE_CONTENT.seo.metaTitle;
  const effectiveDescription =
    seo.metaDescription?.trim() || DEFAULT_LANDING_PAGE_CONTENT.seo.metaDescription;
  const effectiveOgTitle = seo.ogTitle?.trim() || effectiveTitle;
  const effectiveOgDesc = seo.ogDescription?.trim() || effectiveDescription;
  const effectiveOgPreviewImg = seo.ogImageUrl?.trim() || "/opengraph-image";
  const hostname = originDisplay.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");

  if (loading) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Loading SEO &amp; Search Visibility configuration...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-800 to-slate-900 text-white shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-[10px] font-bold uppercase tracking-wider">
            <Search className="h-3 w-3" />
            <span>SEO &amp; Search Engine Visibility</span>
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            Search Metadata, Social Cards &amp; Crawler Controls
          </h2>
          <p className="text-xs text-emerald-100 leading-relaxed">
            Customize Google &amp; Bing metadata, Open Graph social preview cards, JSON-LD rich results,
            and verification tags. Private dashboards remain blocked via{" "}
            <code className="px-1.5 py-0.5 rounded bg-black/25 font-mono">robots.txt</code> and{" "}
            <code className="px-1.5 py-0.5 rounded bg-black/25 font-mono">noindex</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>robots.txt</span>
          </a>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>sitemap.xml</span>
          </a>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting || saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{resetting ? "Resetting..." : "Reset Defaults"}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || resetting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-emerald-50 text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
            ) : (
              <Save className="h-3.5 w-3.5 text-emerald-700" />
            )}
            <span>{saving ? "Publishing..." : "Save SEO Settings"}</span>
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {tableMissing && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <strong>Database notice:</strong> Table{" "}
            <code className="font-mono">public.landing_page_content</code> is not provisioned yet.
            Run migrations{" "}
            <code className="font-mono">20261124000005_landing_page_content.sql</code> and{" "}
            <code className="font-mono">20261126000002_seed_landing_seo_section.sql</code> in Supabase SQL Editor.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: SEO EDITING CONTROLS */}
        <div className="xl:col-span-7 space-y-5">
          {/* Core Meta Tags */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>Search Engine Meta Tags</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Primary title and snippet rendered across Google, Bing, and root layout metadata.
                </p>
              </div>
              {lastUpdated && (
                <span className="text-[10px] font-medium text-slate-400">
                  Saved {lastUpdated.slice(0, 10)}
                </span>
              )}
            </div>

            <div>
              <label className={LABEL_CLASS}>Site / Brand Name (title suffix &amp; og:site_name)</label>
              <input
                type="text"
                value={seo.siteName}
                onChange={(e) => setSeo((prev) => ({ ...prev, siteName: e.target.value }))}
                placeholder="Erudian360"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Meta Title
                </label>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${charBadgeClass(
                    seo.metaTitle.trim().length,
                    50,
                    60
                  )}`}
                >
                  {seo.metaTitle.trim().length} chars (recommended 50–60)
                </span>
              </div>
              <input
                type="text"
                value={seo.metaTitle}
                onChange={(e) => setSeo((prev) => ({ ...prev, metaTitle: e.target.value }))}
                placeholder="Erudian360 — Smart Multi-Tenant School Management SaaS Platform"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Meta Description
                </label>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${charBadgeClass(
                    seo.metaDescription.trim().length,
                    150,
                    160
                  )}`}
                >
                  {seo.metaDescription.trim().length} chars (recommended 150–160)
                </span>
              </div>
              <textarea
                rows={3}
                value={seo.metaDescription}
                onChange={(e) =>
                  setSeo((prev) => ({ ...prev, metaDescription: e.target.value }))
                }
                placeholder="All-in-one multi-tenant school management SaaS for African universities, high schools, and vocational institutions..."
                className={INPUT_CLASS}
              />
            </div>

            {/* Focus Keywords */}
            <div className="space-y-2">
              <label className={LABEL_CLASS}>
                Focus Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => syncKeywordsFromString(e.target.value)}
                placeholder="school management system Africa, university ERP, high school SaaS..."
                className={INPUT_CLASS}
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeywordTag();
                    }
                  }}
                  placeholder="Add single keyword tag and press Enter..."
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={addKeywordTag}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
              {seo.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {seo.keywords.map((kw, idx) => (
                    <span
                      key={`${kw}-${idx}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/70 text-[11px] font-semibold text-blue-700 dark:text-blue-300"
                    >
                      <Tag className="h-3 w-3" />
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => removeKeywordTag(idx)}
                        aria-label={`Remove ${kw}`}
                        className="hover:text-rose-600 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Open Graph & Social Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="h-4 w-4 text-purple-600" />
                <span>Social Share &amp; Open Graph Card</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Leave OG Image URL empty to automatically use the dynamic 1200×630{" "}
                <code className="font-mono">/opengraph-image</code> card.
              </p>
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>Open Graph Image URL (1200×630 PNG/JPG recommended)</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={seo.ogImageUrl}
                  onChange={(e) =>
                    setSeo((prev) => ({ ...prev, ogImageUrl: e.target.value }))
                  }
                  placeholder="https://... (leave empty for /opengraph-image)"
                  className={INPUT_CLASS}
                />
                <label className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  {uploadingOg ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span>{uploadingOg ? "Uploading..." : "Upload"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleOgUpload}
                    disabled={uploadingOg}
                    className="hidden"
                  />
                </label>
                {seo.ogImageUrl && (
                  <button
                    type="button"
                    onClick={() => setSeo((prev) => ({ ...prev, ogImageUrl: "" }))}
                    className="shrink-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>Custom OG Title (optional)</label>
                <input
                  type="text"
                  value={seo.ogTitle}
                  onChange={(e) => setSeo((prev) => ({ ...prev, ogTitle: e.target.value }))}
                  placeholder="Falls back to Meta Title"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Twitter / X Handle (optional)</label>
                <input
                  type="text"
                  value={seo.twitterHandle}
                  onChange={(e) =>
                    setSeo((prev) => ({ ...prev, twitterHandle: e.target.value }))
                  }
                  placeholder="@erudian360"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div>
              <label className={LABEL_CLASS}>Custom OG Description (optional)</label>
              <textarea
                rows={2}
                value={seo.ogDescription}
                onChange={(e) =>
                  setSeo((prev) => ({ ...prev, ogDescription: e.target.value }))
                }
                placeholder="Falls back to Meta Description"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* Search Engine Verification & Structured Data */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Search Console Verification &amp; Organization Schema</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Site verification tokens render as meta tags in the HTML{" "}
                <code className="font-mono">&lt;head&gt;</code>; FAQs &amp; Pricing automatically feed Schema.org JSON-LD.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>
                  Google Search Console Verification (<code className="font-mono">google-site-verification</code>)
                </label>
                <input
                  type="text"
                  value={seo.googleSiteVerification}
                  onChange={(e) =>
                    setSeo((prev) => ({
                      ...prev,
                      googleSiteVerification: e.target.value,
                    }))
                  }
                  placeholder="Paste Google verification token..."
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>
                  Bing Webmaster Verification (<code className="font-mono">msvalidate.01</code>)
                </label>
                <input
                  type="text"
                  value={seo.bingSiteVerification}
                  onChange={(e) =>
                    setSeo((prev) => ({
                      ...prev,
                      bingSiteVerification: e.target.value,
                    }))
                  }
                  placeholder="Paste Bing verification token..."
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={LABEL_CLASS}>
                Organization Social Profile URLs (JSON-LD <code className="font-mono">sameAs</code>)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newSocialUrl}
                  onChange={(e) => setNewSocialUrl(e.target.value)}
                  placeholder="https://linkedin.com/company/erudian360"
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = newSocialUrl.trim();
                    if (!url) return;
                    setSeo((prev) => ({
                      ...prev,
                      socialLinks: [...(prev.socialLinks || []), url],
                    }));
                    setNewSocialUrl("");
                  }}
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Link</span>
                </button>
              </div>
              {(seo.socialLinks || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(seo.socialLinks || []).map((url, idx) => (
                    <span
                      key={`${url}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200"
                    >
                      <span className="max-w-[240px] truncate">{url}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSeo((prev) => ({
                            ...prev,
                            socialLinks: (prev.socialLinks || []).filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE SEARCH & SOCIAL PREVIEWS */}
        <div className="xl:col-span-5 space-y-5 xl:sticky xl:top-20">
          {/* Live Google Search Result Preview */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-blue-600" />
                <span>Live Google Search Preview</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Desktop SERP</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span className="h-5 w-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                  E
                </span>
                <div className="leading-tight min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {seo.siteName || "Erudian360"}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{originDisplay}</div>
                </div>
              </div>
              <div className="text-base font-medium text-[#1A0DAB] dark:text-[#8AB4F8] leading-snug line-clamp-2">
                {effectiveTitle}
              </div>
              <p className="text-xs text-[#4D5156] dark:text-slate-300 leading-relaxed line-clamp-3">
                {effectiveDescription}
              </p>
            </div>
          </div>

          {/* Live Social / Open Graph Card Preview */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="h-3.5 w-3.5 text-purple-600" />
                <span>Social Share / Open Graph Card</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">1.91:1 Summary Card</span>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="aspect-[1200/630] bg-slate-900 overflow-hidden">
                <img
                  src={effectiveOgPreviewImg}
                  alt="Open Graph Social Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3.5 space-y-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {hostname}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2">
                  {effectiveOgTitle}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {effectiveOgDesc}
                </div>
              </div>
            </div>
          </div>

          {/* Private Portal Protection Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Active Crawler &amp; Rich Snippet Rules</span>
            </div>
            <p>
              • Public indexed routes: <code className="font-mono">/</code> and{" "}
              <code className="font-mono">/login</code>
            </p>
            <p>
              • Blocked (<code className="font-mono">Disallow</code> +{" "}
              <code className="font-mono">noindex, nofollow</code>):{" "}
              <code className="font-mono">/super-admin/*</code>,{" "}
              <code className="font-mono">/admin/*</code>,{" "}
              <code className="font-mono">/teacher/*</code>,{" "}
              <code className="font-mono">/lecturer/*</code>,{" "}
              <code className="font-mono">/student/*</code>,{" "}
              <code className="font-mono">/parent/*</code>,{" "}
              <code className="font-mono">/finance/*</code>,{" "}
              <code className="font-mono">/registrar/*</code>,{" "}
              <code className="font-mono">/api/*</code>
            </p>
            <p>
              • JSON-LD active: <code className="font-mono">Organization</code>,{" "}
              <code className="font-mono">SoftwareApplication</code>,{" "}
              <code className="font-mono">FAQPage</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
