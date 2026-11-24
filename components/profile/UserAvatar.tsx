"use client";

import React, { useEffect, useState } from "react";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "rounded";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

function getInitials(name?: string | null): string {
  const clean = String(name || "User").trim();
  if (!clean) return "U";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  src,
  name,
  size = "md",
  shape = "circle",
  className = "",
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const roundedClass = shape === "rounded" ? "rounded-2xl" : "rounded-full";
  const sizeClass = SIZE_CLASSES[size];
  const initials = getInitials(name);

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name || "User profile photo"}
        onError={() => setImgFailed(true)}
        className={`${sizeClass} ${roundedClass} object-cover shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${roundedClass} bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs select-none ${className}`}
      aria-label={name || "User avatar"}
    >
      {initials}
    </div>
  );
}

let cachedAvatarUrl: string | null = null;
let avatarCachedAt = 0;
let inFlightAvatarPromise: Promise<string | null> | null = null;
const AVATAR_CACHE_TTL_MS = 60_000;

export function clearCurrentUserAvatarCache() {
  cachedAvatarUrl = null;
  avatarCachedAt = 0;
  inFlightAvatarPromise = null;
}

async function fetchSharedAvatar(force = false): Promise<string | null> {
  const now = Date.now();
  if (
    !force &&
    cachedAvatarUrl !== null &&
    now - avatarCachedAt < AVATAR_CACHE_TTL_MS
  ) {
    return cachedAvatarUrl;
  }
  if (!force && inFlightAvatarPromise) {
    return inFlightAvatarPromise;
  }

  const p = (async () => {
    try {
      const res = await fetch("/api/profile/avatar", { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json().catch(() => ({}));
      if (json?.avatarUrl !== undefined) {
        cachedAvatarUrl = json.avatarUrl || "";
        avatarCachedAt = Date.now();
        return cachedAvatarUrl;
      }
      return null;
    } catch {
      return null;
    }
  })().finally(() => {
    if (inFlightAvatarPromise === p) {
      inFlightAvatarPromise = null;
    }
  });

  inFlightAvatarPromise = p;
  return p;
}

export function useCurrentUserAvatar(initialUrl?: string | null): string {
  const [avatarUrl, setAvatarUrl] = useState<string>(
    initialUrl || cachedAvatarUrl || ""
  );

  useEffect(() => {
    if (initialUrl) {
      setAvatarUrl(initialUrl);
      cachedAvatarUrl = initialUrl;
      avatarCachedAt = Date.now();
    }
  }, [initialUrl]);

  useEffect(() => {
    let active = true;

    fetchSharedAvatar(false).then((url) => {
      if (active && url !== null) {
        setAvatarUrl(url);
      }
    });

    const onUpdated = (ev: Event) => {
      const custom = ev as CustomEvent<{ avatarUrl?: string | null }>;
      if (custom?.detail && "avatarUrl" in custom.detail) {
        const nextUrl = custom.detail.avatarUrl || "";
        cachedAvatarUrl = nextUrl;
        avatarCachedAt = Date.now();
        setAvatarUrl(nextUrl);
      } else {
        fetchSharedAvatar(true).then((url) => {
          if (active && url !== null) setAvatarUrl(url);
        });
      }
    };

    window.addEventListener("user_avatar_updated", onUpdated);
    return () => {
      active = false;
      window.removeEventListener("user_avatar_updated", onUpdated);
    };
  }, []);

  return avatarUrl;
}
