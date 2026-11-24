"use client";

import { useCallback, useEffect, useState } from "react";

export type StudentPortalSection =
  | "header"
  | "dashboard"
  | "registration"
  | "enrolments"
  | "timetable"
  | "results"
  | "hostel"
  | "fees"
  | "profile"
  | "subjects"
  | "assignments"
  | "attendance"
  | "report-card"
  | "modules"
  | "logbook"
  | "competencies"
  | "attachments"
  | "certifications"
  | "announcements"
  | "notifications";

export interface StudentPortalMutationResult<T = any> {
  ok: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export function useStudentPortalSection<T = any>(section: StudentPortalSection) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/student/portal?section=${encodeURIComponent(section)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || "Unable to load portal data.");
        setData(null);
      } else {
        setData(json as T);
      }
    } catch (err: any) {
      setError(err?.message || "Network error loading student portal.");
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
    ): Promise<StudentPortalMutationResult> => {
      try {
        const res = await fetch("/api/student/portal", {
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
