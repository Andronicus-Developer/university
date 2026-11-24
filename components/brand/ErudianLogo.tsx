import React from "react";

interface ErudianLogoProps {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  brandPrimary?: string;
  brandAccent?: string;
  className?: string;
}

const SIZE_CONFIG = {
  sm: {
    icon: "h-7 w-7",
    text: "text-base",
    badge: "text-[11px]",
  },
  md: {
    icon: "h-8 w-8",
    text: "text-[19px]",
    badge: "text-[12px]",
  },
  lg: {
    icon: "h-10 w-10",
    text: "text-[26px]",
    badge: "text-[15px]",
  },
} as const;

/**
 * Shared Erudian360 brand mark & wordmark used identically on the landing page
 * navbar, dark footer, and `/login` portal card.
 */
export function ErudianLogo({
  variant = "light",
  size = "md",
  brandPrimary = "Erudian",
  brandAccent = "360",
  className = "",
}: ErudianLogoProps) {
  const cfg = SIZE_CONFIG[size];
  const isDark = variant === "dark";

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${cfg.icon} shrink-0`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={isDark ? "erudianPrismDark" : "erudianPrismLight"}
            x1="6"
            y1="4"
            x2="34"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={isDark ? "#FFFFFF" : "#A855F7"} />
            <stop offset="100%" stopColor={isDark ? "#DDD6FE" : "#7C3AED"} />
          </linearGradient>
          <linearGradient
            id={isDark ? "erudianFacetDark" : "erudianFacetLight"}
            x1="12"
            y1="14"
            x2="29"
            y2="33"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={isDark ? "#C4B5FD" : "#C084FC"} />
            <stop offset="100%" stopColor={isDark ? "#A78BFA" : "#6D28D9"} />
          </linearGradient>
        </defs>

        {/* Rounded outer triangular delta mark */}
        <path
          d="M17.35 5.45C18.53 3.42 21.47 3.42 22.65 5.45L35.42 27.55C36.6 29.58 35.13 32.12 32.78 32.12H7.22C4.87 32.12 3.4 29.58 4.58 27.55L17.35 5.45Z"
          fill={`url(#${isDark ? "erudianPrismDark" : "erudianPrismLight"})`}
        />

        {/* Nested layered triangular prism cut */}
        <path
          d="M20 11.4L28.7 26.6H11.3L20 11.4Z"
          fill={isDark ? "#0B0B0F" : "#FFFFFF"}
          fillOpacity={isDark ? "0.85" : "0.92"}
        />
        <path
          d="M20 17.1L24.5 24.9H15.5L20 17.1Z"
          fill={`url(#${isDark ? "erudianFacetDark" : "erudianFacetLight"})`}
        />
      </svg>

      <span
        className={`${cfg.text} font-extrabold tracking-tight leading-none ${
          isDark
            ? "text-white"
            : "text-[#7C3AED] dark:text-[#A78BFA]"
        }`}
      >
        {brandPrimary}
        <span
          className={
            isDark
              ? "text-[#C4B5FD]"
              : "text-[#0F172A] dark:text-white"
          }
        >
          {brandAccent}
        </span>
      </span>
    </span>
  );
}
