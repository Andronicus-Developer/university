"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Hash,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import {
  getSchoolIdNumberingConfigAction,
  saveSchoolIdNumberingConfigAction,
} from "@/app/admin/settings/id-numbering-actions";
import {
  formatIdFromRule,
  getIdCategoriesForSchoolType,
  sanitizeNextNumber,
  sanitizePaddingLength,
  sanitizeSeparator,
  sanitizeYearFormat,
  type IdSequenceRule,
  type IdSeparator,
  type IdYearFormat,
} from "@/lib/id-numbering/config";
import type { PortalSchoolType } from "@/config/schoolPortalConfig";

interface IdNumberingSettingsPanelProps {
  schoolType?: PortalSchoolType;
}

export function IdNumberingSettingsPanel({
  schoolType: fallbackSchoolType = "university",
}: IdNumberingSettingsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewYear, setPreviewYear] = useState(2026);
  const [schoolType, setSchoolType] =
    useState<PortalSchoolType>(fallbackSchoolType);
  const [schoolName, setSchoolName] = useState("");
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [rules, setRules] = useState<IdSequenceRule[]>(() =>
    getIdCategoriesForSchoolType(fallbackSchoolType).map((cat) => {
      const base = {
        entity_type: cat.entity_type,
        prefix: cat.defaultPrefix,
        separator: "-" as IdSeparator,
        include_year: true,
        year_format: "YYYY" as IdYearFormat,
        padding_length: 4,
        next_number: 1,
      };
      return {
        ...base,
        label: cat.label,
        description: cat.description,
        preview: formatIdFromRule(base, 2026),
      };
    })
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadConfig = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await getSchoolIdNumberingConfigAction();
      if (!res.ok) {
        setFeedback({ type: "error", text: res.error });
        return;
      }
      setSchoolType(res.schoolType);
      setSchoolName(res.schoolName);
      setRules(res.rules);
      setMigrationMissing(res.migrationMissing);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Failed to load ID numbering rules.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPreviewYear(new Date().getFullYear());
    loadConfig();
  }, []);

  const updateRule = (
    entityType: string,
    patch: Partial<{
      prefix: string;
      separator: IdSeparator;
      include_year: boolean;
      year_format: IdYearFormat;
      padding_length: number;
      next_number: number;
    }>
  ) => {
    setRules((prev) =>
      prev.map((row) => {
        if (row.entity_type !== entityType) return row;
        const next = {
          ...row,
          ...patch,
          separator: sanitizeSeparator(
            patch.separator !== undefined ? patch.separator : row.separator
          ),
          year_format: sanitizeYearFormat(
            patch.year_format !== undefined ? patch.year_format : row.year_format
          ),
          padding_length: sanitizePaddingLength(
            patch.padding_length !== undefined
              ? patch.padding_length
              : row.padding_length
          ),
          next_number: sanitizeNextNumber(
            patch.next_number !== undefined ? patch.next_number : row.next_number
          ),
        };
        return {
          ...next,
          preview: formatIdFromRule(next, previewYear),
        };
      })
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await saveSchoolIdNumberingConfigAction(
        rules.map((r) => ({
          entity_type: r.entity_type,
          prefix: r.prefix,
          separator: r.separator,
          include_year: r.include_year,
          year_format: r.year_format,
          padding_length: r.padding_length,
          next_number: r.next_number,
        }))
      );

      if (!res.ok) {
        if (res.migrationMissing) setMigrationMissing(true);
        setFeedback({ type: "error", text: res.error });
        return;
      }

      setMigrationMissing(false);
      setRules(res.rules);
      setFeedback({
        type: "success",
        text: "Custom ID numbering configuration saved! New student and staff records will use these atomic sequences.",
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Unable to save ID numbering configuration.",
      });
    } finally {
      setSaving(false);
    }
  };

  const schoolTypeLabel =
    schoolType === "vocational"
      ? "Vocational / Technical"
      : schoolType === "high_school"
      ? "High School"
      : "University";

  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Custom ID Numbering System
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                  {schoolTypeLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Configure institutional ID formats and atomic sequence counters
                {schoolName ? ` for ${schoolName}` : ""}. Existing records remain unchanged.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadConfig}
              disabled={loading || saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Reload</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save ID Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>

        {migrationMissing && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Database Migration Pending</p>
              <p className="text-[11px] mt-0.5">
                Run{" "}
                <code className="font-mono bg-amber-100/80 dark:bg-amber-900/50 px-1 rounded">
                  supabase/migrations/20261124000014_school_id_sequences.sql
                </code>{" "}
                in your Supabase SQL Editor to enable saving custom rules and atomic sequence counters.
              </p>
            </div>
          </div>
        )}

        {feedback && (
          <div
            className={`flex items-center gap-2 p-3.5 rounded-xl text-xs font-semibold border ${
              feedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800"
            }`}
          >
            <CheckCircle
              className={`h-4 w-4 shrink-0 ${
                feedback.type === "success" ? "text-emerald-600" : "text-rose-600"
              }`}
            />
            <span>{feedback.text}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span>Loading ID numbering configuration...</span>
          </div>
        ) : (
          <div className="space-y-3.5">
            {rules.map((row) => (
              <div
                key={row.entity_type}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {row.label}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {row.description}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-800/70 shadow-2xs self-start sm:self-auto">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Preview:
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {formatIdFromRule(row, previewYear)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Prefix
                    </label>
                    <input
                      type="text"
                      maxLength={24}
                      value={row.prefix}
                      onChange={(e) =>
                        updateRule(row.entity_type, {
                          prefix: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="e.g. ACH-STU"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono uppercase text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Separator
                    </label>
                    <select
                      value={row.separator}
                      onChange={(e) =>
                        updateRule(row.entity_type, {
                          separator: sanitizeSeparator(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    >
                      <option value="-">Hyphen (-)</option>
                      <option value="/">Slash (/)</option>
                      <option value="">None</option>
                    </select>
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Include Year
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateRule(row.entity_type, {
                          include_year: !row.include_year,
                        })
                      }
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                        row.include_year
                          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"
                      }`}
                    >
                      {row.include_year ? "Enabled" : "Disabled"}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Year Format
                    </label>
                    <select
                      value={row.year_format}
                      disabled={!row.include_year}
                      onChange={(e) =>
                        updateRule(row.entity_type, {
                          year_format: sanitizeYearFormat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    >
                      <option value="YYYY">4-Digit ({previewYear})</option>
                      <option value="YY">
                        2-Digit ({String(previewYear).slice(-2)})
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Digits / Padding
                    </label>
                    <select
                      value={row.padding_length}
                      onChange={(e) =>
                        updateRule(row.entity_type, {
                          padding_length: sanitizePaddingLength(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    >
                      <option value={3}>3 Digits (001)</option>
                      <option value={4}>4 Digits (0001)</option>
                      <option value={5}>5 Digits (00001)</option>
                      <option value={6}>6 Digits (000001)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Next Sequence #
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={row.next_number}
                      onChange={(e) =>
                        updateRule(row.entity_type, {
                          next_number: sanitizeNextNumber(e.target.value || 1),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
