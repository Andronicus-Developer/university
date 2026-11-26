"use client";

import React, { useState } from "react";
import { Globe } from "lucide-react";
import { getFlagCdnUrl, OTHER_COUNTRY_CODE, resolveSchoolCountry } from "@/lib/africanCountries";

interface CountryFlagBadgeProps {
  country?: string | null;
  countryCode?: string | null;
  schoolName?: string | null;
  size?: "sm" | "md";
  showCode?: boolean;
  showName?: boolean;
  className?: string;
}

export function CountryFlagBadge({
  country,
  countryCode,
  schoolName,
  size = "sm",
  showCode = false,
  showName = false,
  className = "",
}: CountryFlagBadgeProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const resolved = resolveSchoolCountry({ country, countryCode });
  if (!resolved.country && !resolved.countryCode) {
    return null;
  }

  const normalizedCode = resolved.countryCode;
  const flagUrl = !imgFailed ? getFlagCdnUrl(normalizedCode) : null;
  const displayName = resolved.country || normalizedCode;
  const tooltip = schoolName
    ? `${schoolName} • ${displayName}`
    : `Country: ${displayName}`;

  const flagSizeClass = size === "md" ? "h-4 w-5.5" : "h-3.5 w-5";

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/80 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 shadow-2xs select-none shrink-0 ${className}`}
    >
      {flagUrl ? (
        <img
          src={flagUrl}
          alt={`${displayName} flag`}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className={`${flagSizeClass} rounded-[3px] object-cover ring-1 ring-black/10 dark:ring-white/15 shrink-0`}
        />
      ) : normalizedCode && normalizedCode !== OTHER_COUNTRY_CODE ? (
        <span className="inline-flex items-center justify-center rounded-[3px] bg-slate-100 dark:bg-slate-700 px-1 py-0.5 text-[9px] font-bold tracking-wider text-slate-700 dark:text-slate-200 leading-none">
          {normalizedCode}
        </span>
      ) : (
        <Globe className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
      )}

      {showCode && normalizedCode && normalizedCode !== OTHER_COUNTRY_CODE && (
        <span className="text-[10px] font-bold tracking-wide text-slate-600 dark:text-slate-300 leading-none">
          {normalizedCode}
        </span>
      )}

      {showName && (
        <span className="truncate max-w-[140px] leading-none">{displayName}</span>
      )}
    </span>
  );
}
