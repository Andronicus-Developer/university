"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { WardSummary } from "@/lib/parent/parent-context";

interface ParentBootstrap {
  school: {
    id: string;
    name: string;
    school_type: string;
    currency: string;
    logo_url: string;
  };
  parent: {
    id: string | null;
    full_name: string;
    email: string;
    phone: string;
    relationship: string;
    occupation: string;
    address: string;
  };
  wards: WardSummary[];
}

interface ParentContextValue {
  wards: WardSummary[];
  activeWardId: string;
  activeWard: WardSummary | null;
  school: ParentBootstrap["school"] | null;
  parentProfile: ParentBootstrap["parent"] | null;
  loadingWards: boolean;
  setActiveWardId: (id: string) => void;
  reloadBootstrap: () => Promise<void>;
}

const STORAGE_KEY = "parent_active_ward_id";
const ParentContext = createContext<ParentContextValue | null>(null);

export function ParentPortalProvider({ children }: { children: React.ReactNode }) {
  const [wards, setWards] = useState<WardSummary[]>([]);
  const [activeWardId, setActiveWardIdState] = useState<string>("");
  const [school, setSchool] = useState<ParentBootstrap["school"] | null>(null);
  const [parentProfile, setParentProfile] = useState<ParentBootstrap["parent"] | null>(null);
  const [loadingWards, setLoadingWards] = useState(true);

  const reloadBootstrap = useCallback(async () => {
    setLoadingWards(true);
    try {
      const res = await fetch("/api/parent/portal?section=bootstrap", {
        cache: "no-store",
      });
      if (!res.ok) {
        setWards([]);
        return;
      }
      const json: ParentBootstrap = await res.json();
      const loadedWards = json.wards || [];
      setWards(loadedWards);
      setSchool(json.school || null);
      setParentProfile(json.parent || null);

      const saved =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) || "" : "";
      const validSaved = loadedWards.some((w) => w.id === saved) ? saved : "";
      const chosen = validSaved || loadedWards[0]?.id || "";
      setActiveWardIdState(chosen);
      if (chosen && typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, chosen);
      }
    } finally {
      setLoadingWards(false);
    }
  }, []);

  useEffect(() => {
    reloadBootstrap();
  }, [reloadBootstrap]);

  const setActiveWardId = useCallback((id: string) => {
    setActiveWardIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const activeWard = wards.find((w) => w.id === activeWardId) || wards[0] || null;

  return (
    <ParentContext.Provider
      value={{
        wards,
        activeWardId: activeWard?.id || activeWardId,
        activeWard,
        school,
        parentProfile,
        loadingWards,
        setActiveWardId,
        reloadBootstrap,
      }}
    >
      {children}
    </ParentContext.Provider>
  );
}

export function useParentContext() {
  const ctx = useContext(ParentContext);
  if (!ctx) {
    throw new Error("useParentContext must be used inside ParentPortalProvider");
  }
  return ctx;
}

export function useParentSection<T = any>(section: string) {
  const { activeWardId, loadingWards } = useParentContext();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (loadingWards) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ section });
      if (activeWardId) qs.set("studentId", activeWardId);
      const res = await fetch(`/api/parent/portal?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || "Failed to load parent portal data.");
        setData(null);
      } else {
        setData(json as T);
      }
    } catch (err: any) {
      setError(err?.message || "Network error while loading portal data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [section, activeWardId, loadingWards]);

  useEffect(() => {
    load();
  }, [load]);

  const mutate = useCallback(
    async (action: string, payload: Record<string, any> = {}) => {
      try {
        const res = await fetch("/api/parent/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            studentId: activeWardId || undefined,
            ...payload,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false as const, error: json?.error || "Request failed." };
        }
        await load();
        return { ok: true as const, data: json };
      } catch (err: any) {
        return { ok: false as const, error: err?.message || "Network error." };
      }
    },
    [activeWardId, load]
  );

  return { data, loading: loading || loadingWards, error, reload: load, mutate };
}
