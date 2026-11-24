"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Calculator,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";
import type { SafeIntegrationRecord } from "@/lib/superadmin/integrations-catalog";
import {
  createCustomIntegrationAction,
  getIntegrationsAction,
} from "@/app/superadmin/integrations/actions";

function getCategoryIcon(slug: string, category: string) {
  if (slug.includes("pay") || category === "Fintech") return CreditCard;
  if (slug.includes("moodle") || category === "E-Learning") return GraduationCap;
  if (slug.includes("email") || slug.includes("resend")) return Mail;
  if (slug.includes("sms") || category === "Communications") return MessageSquare;
  if (slug.includes("erp") || category === "Accounting") return Calculator;
  return Boxes;
}

function getStatusBadge(status: SafeIntegrationRecord["status"]) {
  if (status === "connected") {
    return {
      label: "Connected",
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotClass: "bg-emerald-500",
    };
  }
  if (status === "disabled") {
    return {
      label: "Disabled",
      classes: "bg-slate-100 text-slate-600 border-slate-200",
      dotClass: "bg-slate-400",
    };
  }
  return {
    label: "Not Configured",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  };
}

function formatUpdatedLabel(iso?: string | null): string {
  if (!iso) return "Not configured yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Configured";
  return `Updated ${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<SafeIntegrationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("Custom API");
  const [customDescription, setCustomDescription] = useState<string>("");
  const [creatingCustom, setCreatingCustom] = useState<boolean>(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const loadIntegrations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const res = await getIntegrationsAction();
      if (!res.ok) {
        setErrorMsg(res.error || "Unable to load integrations.");
        return;
      }
      setIntegrations(res.data);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load platform integrations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations(false);
  }, [loadIntegrations]);

  const counts = useMemo(() => {
    const connected = integrations.filter((i) => i.status === "connected").length;
    const notConfigured = integrations.filter((i) => i.status === "not_configured").length;
    const disabled = integrations.filter((i) => i.status === "disabled").length;
    return { connected, notConfigured, disabled };
  }, [integrations]);

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);
    if (!customName.trim()) {
      setCustomError("Please provide an integration name.");
      return;
    }

    setCreatingCustom(true);
    try {
      const res = await createCustomIntegrationAction({
        name: customName.trim(),
        category: customCategory.trim() || "Custom",
        description: customDescription.trim(),
      });

      if (!res.ok) {
        setCustomError(res.error || "Unable to create integration.");
        return;
      }

      setShowCustomModal(false);
      setCustomName("");
      setCustomCategory("Custom API");
      setCustomDescription("");
      router.push(`/superadmin/integrations/${res.data.slug}`);
    } catch (err: any) {
      setCustomError(err?.message || "Failed to create custom integration.");
    } finally {
      setCreatingCustom(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* Sub-Header: Breadcrumbs + Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link
              href="/superadmin/dashboard"
              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
            >
              Super Admin
            </Link>
            <span className="text-slate-300">/</span>
            <span>Platform Configuration</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">Integrations &amp; External APIs</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 mt-1">
            Platform Integrations &amp; External APIs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure LMS, payment gateways, transactional email, SMS, and ERP keys across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadIntegrations(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCustomError(null);
              setShowCustomModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Custom Integration</span>
          </button>
        </div>
      </div>

      {/* Status Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Connected APIs</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
              {loading ? "—" : counts.connected}
            </div>
          </div>
          <span className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Awaiting Configuration</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-0.5">
              {loading ? "—" : counts.notConfigured}
            </div>
          </div>
          <span className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Settings className="h-5 w-5" />
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Disabled (Keys Saved)</div>
            <div className="text-2xl font-extrabold text-slate-700 mt-0.5">
              {loading ? "—" : counts.disabled}
            </div>
          </div>
          <span className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center">
            <Boxes className="h-5 w-5" />
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => loadIntegrations(true)}
            className="px-3 py-1 rounded-lg bg-white border border-red-200 text-red-700 font-semibold hover:bg-red-100 cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Integrations Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-slate-100" />
                <div className="h-5 w-24 rounded-full bg-slate-100" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-slate-100" />
                <div className="h-3 w-1/3 rounded bg-slate-100" />
              </div>
              <div className="h-10 w-full rounded bg-slate-100" />
              <div className="pt-3 border-t border-slate-100 flex justify-between">
                <div className="h-3 w-28 rounded bg-slate-100" />
                <div className="h-3 w-16 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {integrations.map((item) => {
            const Icon = getCategoryIcon(item.slug, item.category);
            const badge = getStatusBadge(item.status);
            const configuredKeysCount = Object.values(item.hasSecrets).filter(Boolean).length;

            return (
              <div
                key={item.slug}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {item.status !== "not_configured" && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.mode === "live"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {item.mode === "live" ? "Live Mode" : "Test Mode"}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.classes}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {item.name}
                      </h3>
                      {item.isCustom && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Custom
                        </span>
                      )}
                    </div>
                    <span className="text-[10.5px] font-semibold text-blue-600">
                      {item.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {item.status === "connected" && item.lastSyncedAt
                      ? formatUpdatedLabel(item.lastSyncedAt)
                      : configuredKeysCount > 0
                      ? `${configuredKeysCount} secret key${configuredKeysCount > 1 ? "s" : ""} saved`
                      : formatUpdatedLabel(item.updatedAt)}
                  </span>

                  <Link
                    href={`/superadmin/integrations/${item.slug}`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-[11px] hover:underline"
                  >
                    <span>Settings</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Integration Modal */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creatingCustom) {
              setShowCustomModal(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Add Custom Integration
                </h2>
                <p className="text-[11px] text-slate-500">
                  Register a new API or webhook provider and configure its credentials next.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                disabled={creatingCustom}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="p-5 space-y-4">
              {customError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {customError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Provider Name *
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Zoom Academic Classroom"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Custom API">Custom API</option>
                  <option value="E-Learning">E-Learning</option>
                  <option value="Fintech">Fintech</option>
                  <option value="Communications">Communications</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Identity / SSO">Identity / SSO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Briefly describe what this integration syncs or triggers..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  disabled={creatingCustom}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCustom}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
                >
                  {creatingCustom ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create &amp; Configure</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
