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

export function useCurrentUserAvatar(initialUrl?: string | null): string {
  const [avatarUrl, setAvatarUrl] = useState<string>(initialUrl || "");

  useEffect(() => {
    if (initialUrl) setAvatarUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    let active = true;
    async function loadAvatar() {
      try {
        const res = await fetch("/api/profile/avatar", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        if (active && json?.avatarUrl !== undefined) {
          setAvatarUrl(json.avatarUrl || "");
        }
      } catch {
        // ignore
      }
    }

    loadAvatar();

    const onUpdated = (ev: Event) => {
      const custom = ev as CustomEvent<{ avatarUrl?: string | null }>;
      if (custom?.detail && "avatarUrl" in custom.detail) {
        setAvatarUrl(custom.detail.avatarUrl || "");
      } else {
        loadAvatar();
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
