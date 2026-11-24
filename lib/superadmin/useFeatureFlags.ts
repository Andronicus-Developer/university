"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildDefaultEnabledMap,
  findDisabledFlagForPath,
  isHrefEnabledByFlags,
  type FeatureFlagDefinition,
} from "@/lib/superadmin/feature-flags-catalog";

const FLAGS_CACHE_TTL_MS = 30_000;
const flagsCacheMap = new Map<string, { flags: Record<string, boolean>; fetchedAt: number }>();
const inFlightFlagsMap = new Map<string, Promise<Record<string, boolean> | null>>();

export function clearFeatureFlagsCache() {
  flagsCacheMap.clear();
  inFlightFlagsMap.clear();
}

async function fetchSharedFeatureFlags(
  schoolId?: string | null,
  force = false
): Promise<Record<string, boolean> | null> {
  const cacheKey = schoolId ? String(schoolId) : "__global__";
  const now = Date.now();
  const cached = flagsCacheMap.get(cacheKey);
  if (!force && cached && now - cached.fetchedAt < FLAGS_CACHE_TTL_MS) {
    return cached.flags;
  }

  const existing = inFlightFlagsMap.get(cacheKey);
  if (!force && existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const qs = schoolId
        ? `?schoolId=${encodeURIComponent(schoolId)}`
        : "";
      const res = await fetch(`/api/public/feature-flags${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      const body = await res.json();
      if (body?.flags && typeof body.flags === "object") {
        const merged = {
          ...buildDefaultEnabledMap(),
          ...body.flags,
        };
        flagsCacheMap.set(cacheKey, { flags: merged, fetchedAt: Date.now() });
        return merged;
      }
      return null;
    } catch {
      return null;
    }
  })().finally(() => {
    if (inFlightFlagsMap.get(cacheKey) === promise) {
      inFlightFlagsMap.delete(cacheKey);
    }
  });

  inFlightFlagsMap.set(cacheKey, promise);
  return promise;
}

export function useFeatureFlags(schoolId?: string | null) {
  const cacheKey = schoolId ? String(schoolId) : "__global__";
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const cached = flagsCacheMap.get(cacheKey);
    return cached ? cached.flags : buildDefaultEnabledMap();
  });
  const [loaded, setLoaded] = useState<boolean>(false);

  const loadFlags = useCallback(
    async (force = false) => {
      try {
        const nextFlags = await fetchSharedFeatureFlags(schoolId, force);
        if (nextFlags) {
          setFlags(nextFlags);
        }
      } finally {
        setLoaded(true);
      }
    },
    [schoolId]
  );

  useEffect(() => {
    loadFlags(false);

    const handleUpdated = () => {
      clearFeatureFlagsCache();
      loadFlags(true);
    };
    window.addEventListener("feature_flags_updated", handleUpdated);
    return () => {
      window.removeEventListener("feature_flags_updated", handleUpdated);
    };
  }, [loadFlags]);

  const refresh = useCallback(() => loadFlags(true), [loadFlags]);

  const isEnabled = useCallback(
    (portalKey: string) => {
      return flags[portalKey] !== false;
    },
    [flags]
  );

  const isHrefEnabled = useCallback(
    (href: string) => {
      return isHrefEnabledByFlags(href, flags);
    },
    [flags]
  );

  const findDisabledForPath = useCallback(
    (pathname: string): FeatureFlagDefinition | null => {
      return findDisabledFlagForPath(pathname, flags);
    },
    [flags]
  );

  return {
    flags,
    loaded,
    isEnabled,
    isHrefEnabled,
    findDisabledForPath,
    refresh,
  };
}
