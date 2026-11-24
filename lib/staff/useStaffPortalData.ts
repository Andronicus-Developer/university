"use client";

import { useCallback, useEffect, useState } from "react";

export type StaffPortalSection =
  | "header"
  | "dashboard"
  | "profile"
  | "uni_courses"
  | "uni_attendance"
  | "uni_assignments"
  | "uni_grades"
  | "uni_timetable"
  | "uni_advising"
  | "hs_classes"
  | "hs_attendance"
  | "hs_homework"
  | "hs_report_cards"
  | "hs_timetable"
  | "hs_messages"
  | "voc_modules"
  | "voc_attendance"
  | "voc_logbooks"
  | "voc_competencies"
  | "voc_attachments"
  | "voc_inventory";

export interface StaffPortalMutationResult<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export function useStaffPortalSection<T = any>(section: StaffPortalSection) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/staff/portal?section=${encodeURIComponent(section)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || "Unable to load academic staff portal data.");
        setData(null);
      } else {
        setData(json as T);
      }
    } catch (err: any) {
      setError(err?.message || "Network error loading staff portal data.");
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    reload();
  }, [reload]);

  const mutate = useCallback(
    async (
      action: string,
      payload: Record<string, any> = {}
    ): Promise<StaffPortalMutationResult> => {
      try {
        const res = await fetch("/api/staff/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false,
            error: json?.error || "Operation failed.",
          };
        }
        await reload();
        return {
          ok: true,
          data: json,
          message: json?.message,
        };
      } catch (err: any) {
        return {
          ok: false,
          error: err?.message || "Network error saving changes.",
        };
      }
    },
    [reload]
  );

  return { data, loading, error, reload, mutate };
}
