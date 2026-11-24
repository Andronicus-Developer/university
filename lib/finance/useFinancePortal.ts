"use client";

import { useCallback, useEffect, useState } from "react";

export function useFinanceSection<T = any>(
  section: string,
  extraQuery?: Record<string, string | undefined>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = (() => {
    const p = new URLSearchParams({ section });
    if (extraQuery) {
      for (const [k, v] of Object.entries(extraQuery)) {
        if (v) p.set(k, v);
      }
    }
    return p.toString();
  })();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/portal?${queryString}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || "Failed to load finance portal data.");
        setData(null);
      } else {
        setData(json as T);
      }
    } catch (err: any) {
      setError(err?.message || "Network error while loading finance data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    load();
  }, [load]);

  const mutate = useCallback(
    async (action: string, payload: Record<string, any> = {}) => {
      try {
        const res = await fetch("/api/finance/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false as const, error: json?.error || "Operation failed." };
        }
        await load();
        return { ok: true as const, data: json };
      } catch (err: any) {
        return { ok: false as const, error: err?.message || "Network error." };
      }
    },
    [load]
  );

  return { data, loading, error, reload: load, mutate };
}
