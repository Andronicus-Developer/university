"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildDefaultEnabledMap,
  findDisabledFlagForPath,
  isHrefEnabledByFlags,
  type FeatureFlagDefinition,
} from "@/lib/superadmin/feature-flags-catalog";

export function useFeatureFlags(schoolId?: string | null) {
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    buildDefaultEnabledMap()
  );
  const [loaded, setLoaded] = useState<boolean>(false);

  const loadFlags = useCallback(async () => {
    try {
      const qs = schoolId
        ? `?schoolId=${encodeURIComponent(schoolId)}`
        : "";
      const res = await fetch(`/api/public/feature-flags${qs}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const body = await res.json();
        if (body?.flags && typeof body.flags === "object") {
          setFlags({
            ...buildDefaultEnabledMap(),
            ...body.flags,
          });
        }
      }
    } catch {
      // Keep default flags on transient network interruption
    } finally {
      setLoaded(true);
    }
  }, [schoolId]);

  useEffect(() => {
    loadFlags();

    const handleUpdated = () => {
      loadFlags();
    };
    window.addEventListener("feature_flags_updated", handleUpdated);
    return () => {
      window.removeEventListener("feature_flags_updated", handleUpdated);
    };
  }, [loadFlags]);

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
    refresh: loadFlags,
  };
}
