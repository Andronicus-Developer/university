"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sliders,
  Trash2,
} from "lucide-react";
import type {
  IntegrationMode,
  SafeIntegrationRecord,
} from "@/lib/superadmin/integrations-catalog";
import {
  getIntegrationDetailAction,
  saveIntegrationConfigAction,
} from "@/app/superadmin/integrations/actions";

function IntegrationConfigContent() {
  const params = useParams();
  const slug = String(params?.slug || "").trim().toLowerCase();

  const [record, setRecord] = useState<SafeIntegrationRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [mode, setMode] = useState<IntegrationMode>("test");
  const [configState, setConfigState] = useState<Record<string, string | boolean>>({});
  const [secretInputs, setSecretInputs] = useState<Record<string, string>>({});
  const [clearedSecrets, setClearedSecrets] = useState<Record<string, boolean>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [webhookOrigin, setWebhookOrigin] = useState<string>("");
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookOrigin(window.location.origin);
    }
  }, []);

  const hydrateFromRecord = useCallback((data: SafeIntegrationRecord) => {
    setRecord(data);
    setIsEnabled(data.isEnabled);
    setMode(data.mode);
    setConfigState(data.config || {});
    setSecretInputs({});
    setClearedSecrets({});
  }, []);

  const loadDetail = useCallback(async () => {
    if (!slug) {
      setLoadError("Invalid integration identifier.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const res = await getIntegrationDetailAction(slug);
      if (!res.ok) {
        setLoadError(res.error || "Integration not found.");
        return;
      }
      hydrateFromRecord(res.data);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load integration settings.");
    } finally {
      setLoading(false);
    }
  }, [slug, hydrateFromRecord]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    setSaving(true);
    setSaveError(null);
    setSaveBanner(null);

    try {
      const clearedKeys = Object.entries(clearedSecrets)
        .filter(([, isCleared]) => isCleared)
        .map(([key]) => key);

      const res = await saveIntegrationConfigAction({
        slug: record.slug,
        isEnabled,
        mode,
        config: configState,
        secretUpdates: secretInputs,
        clearedSecrets: clearedKeys,
      });

      if (!res.ok) {
        setSaveError(res.error || "Unable to save configuration.");
        return;
      }

      hydrateFromRecord(res.data);
      const statusText =
        res.data.status === "connected"
          ? "Connected"
          : res.data.status === "disabled"
          ? "Disabled (Keys Saved)"
          : "Not Configured (missing required credentials)";
      setSaveBanner(`Configuration saved successfully. Status: ${statusText}.`);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save integration configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-xs font-medium">Loading integration configuration...</p>
      </div>
    );
  }

  if (loadError || !record) {
    return (
      <div className="max-w-3xl mx-auto py-10 space-y-4">
        <Link
          href="/superadmin/integrations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Integrations &amp; APIs</span>
        </Link>

        <div className="p-8 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="h-11 w-11 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h1 className="text-base font-bold text-slate-900">
            {loadError || "Integration Not Found"}
          </h1>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            The requested integration configuration could not be loaded. Return to the main integrations directory to pick an active provider.
          </p>
        </div>
      </div>
    );
  }

  const statusBadge =
    record.status === "connected"
      ? {
          label: "Connected",
          classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
          dot: "bg-emerald-500",
        }
      : record.status === "disabled"
      ? {
          label: "Disabled",
          classes: "bg-slate-100 text-slate-600 border-slate-200",
          dot: "bg-slate-400",
        }
      : {
          label: "Not Configured",
          classes: "bg-amber-50 text-amber-700 border-amber-200",
          dot: "bg-amber-500",
        };

  const fullWebhookUrl = record.webhookPath
    ? `${webhookOrigin || ""}${record.webhookPath}`
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-14 font-sans">
      {/* Breadcrumbs + Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
          <Link
            href="/superadmin/dashboard"
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            Super Admin
          </Link>
          <span className="text-slate-300">/</span>
          <Link
            href="/superadmin/integrations"
            className="text-blue-600 hover:text-blue-700 hover:underline"
          >
            Integrations &amp; APIs
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">{record.name}</span>
        </div>

        <Link
          href="/superadmin/integrations"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Integrations</span>
        </Link>
      </div>

      {/* Provider Header Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10.5px] font-bold">
                {record.category}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${statusBadge.classes}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
                {statusBadge.label}
              </span>
              {record.status !== "not_configured" && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10.5px] font-bold">
                  {record.mode === "live" ? "Live Mode" : "Test Mode"}
                </span>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-2">
              {record.name}
            </h1>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {record.description}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11.5px] text-slate-600 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <span>{record.docsHint}</span>
        </div>
      </div>

      {saveBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{saveBanner}</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Activation & Mode Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="h-4 w-4 text-blue-600" />
            <span>Environment &amp; Activation Controls</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Enable Integration
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Activate API calls once required credentials are saved.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                onClick={() => setIsEnabled((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                  isEnabled ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70">
              <div className="text-xs font-bold text-slate-900 mb-2">
                Environment Mode
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("test")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    mode === "test"
                      ? "bg-white text-slate-900 border-blue-500 shadow-2xs"
                      : "bg-transparent text-slate-500 border-transparent hover:text-slate-800"
                  }`}
                >
                  Test / Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => setMode("live")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    mode === "live"
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-transparent text-slate-500 border-transparent hover:text-slate-800"
                  }`}
                >
                  Live / Production
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Provider Credentials Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-blue-600" />
              <span>API Keys &amp; Provider Credentials</span>
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              Secrets are masked on reload
            </span>
          </div>

          <div className="space-y-4">
            {record.fields.map((field) => {
              if (field.type === "toggle") {
                const toggleVal = Boolean(configState[field.key]);
                return (
                  <div
                    key={field.key}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/70"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        {field.label}
                      </div>
                      {field.helperText && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {field.helperText}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={toggleVal}
                      onClick={() =>
                        setConfigState((prev) => ({
                          ...prev,
                          [field.key]: !toggleVal,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                        toggleVal ? "bg-emerald-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          toggleVal ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                );
              }

              if (field.type === "select") {
                return (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <select
                      value={String(configState[field.key] ?? field.defaultValue ?? "")}
                      onChange={(e) =>
                        setConfigState((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                    >
                      {(field.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {field.helperText && (
                      <p className="text-[11px] text-slate-400 mt-1">{field.helperText}</p>
                    )}
                  </div>
                );
              }

              if (field.isSecret || field.type === "secret") {
                const hasExisting = Boolean(record.hasSecrets[field.key]);
                const maskedHint = record.maskedSecrets[field.key] || "";
                const isCleared = Boolean(clearedSecrets[field.key]);
                const showPlain = Boolean(visibleSecrets[field.key]);

                return (
                  <div
                    key={field.key}
                    className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-slate-800">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>

                      <div className="flex items-center gap-2">
                        {hasExisting && !isCleared && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-semibold">
                            Configured ({maskedHint})
                          </span>
                        )}
                        {hasExisting && (
                          <button
                            type="button"
                            onClick={() => {
                              setClearedSecrets((prev) => ({
                                ...prev,
                                [field.key]: !prev[field.key],
                              }));
                              setSecretInputs((prev) => ({ ...prev, [field.key]: "" }));
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer ${
                              isCleared
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-white text-slate-600 border border-slate-200 hover:text-red-600"
                            }`}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>{isCleared ? "Undo Clear" : "Clear Key"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type={showPlain ? "text" : "password"}
                        autoComplete="new-password"
                        disabled={isCleared}
                        value={secretInputs[field.key] || ""}
                        onChange={(e) =>
                          setSecretInputs((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        placeholder={
                          isCleared
                            ? "Existing key will be cleared upon save"
                            : hasExisting && maskedHint
                            ? `${maskedHint} (leave blank to keep existing key)`
                            : field.placeholder || "Enter secret credential"
                        }
                        className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleSecrets((prev) => ({
                            ...prev,
                            [field.key]: !prev[field.key],
                          }))
                        }
                        aria-label={showPlain ? "Hide secret input" : "Show secret input"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                      >
                        {showPlain ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {field.helperText && (
                      <p className="text-[11px] text-slate-500">
                        {field.helperText}
                        {hasExisting && !isCleared
                          ? " Leave blank to keep the existing saved key."
                          : ""}
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <input
                    type={
                      field.type === "email"
                        ? "email"
                        : field.type === "number"
                        ? "number"
                        : field.type === "url"
                        ? "url"
                        : "text"
                    }
                    value={String(configState[field.key] ?? "")}
                    onChange={(e) =>
                      setConfigState((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    placeholder={field.placeholder || ""}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                  {field.helperText && (
                    <p className="text-[11px] text-slate-400 mt-1">{field.helperText}</p>
                  )}
                </div>
              );
            })}
          </div>

          {fullWebhookUrl && (
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-blue-900">
                  Inbound Webhook Callback Endpoint
                </div>
                <div className="text-[11px] font-mono text-blue-700 truncate mt-0.5">
                  {fullWebhookUrl}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(fullWebhookUrl).catch(() => {});
                  setCopiedWebhook(true);
                  setTimeout(() => setCopiedWebhook(false), 1800);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 text-[11px] font-semibold hover:bg-blue-50 cursor-pointer shrink-0 w-fit"
              >
                {copiedWebhook ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Endpoint</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Sticky Footer Submit Bar */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Link
            href="/superadmin/integrations"
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Configuration...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function IntegrationConfigPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Loading integration configuration...</p>
        </div>
      }
    >
      <IntegrationConfigContent />
    </React.Suspense>
  );
}
