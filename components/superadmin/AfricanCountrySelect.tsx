"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Globe, Search, X } from "lucide-react";
import {
  ALL_SCHOOL_COUNTRY_OPTIONS,
  CountryOption,
  findCountryOption,
  getFlagCdnUrl,
  OTHER_COUNTRY_CODE,
} from "@/lib/africanCountries";

interface AfricanCountrySelectProps {
  value: string;
  countryCode?: string;
  onChange: (countryName: string, countryCode: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  className?: string;
}

function FlagPreview({ code, name }: { code?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const url = !failed ? getFlagCdnUrl(code) : null;

  if (url) {
    return (
      <img
        src={url}
        alt={`${name} flag`}
        onError={() => setFailed(true)}
        className="h-3.5 w-5 rounded-[3px] object-cover ring-1 ring-black/10 shrink-0"
      />
    );
  }
  if (code && code !== OTHER_COUNTRY_CODE) {
    return (
      <span className="inline-flex items-center justify-center rounded-[3px] bg-slate-200 px-1 py-0.5 text-[9px] font-bold text-slate-700 shrink-0">
        {code}
      </span>
    );
  }
  return <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
}

export function AfricanCountrySelect({
  value,
  countryCode,
  onChange,
  placeholder = "Select Country",
  required = false,
  disabled = false,
  error = false,
  id,
  className = "",
}: AfricanCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => findCountryOption(value, countryCode),
    [value, countryCode]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_SCHOOL_COUNTRY_OPTIONS;
    return ALL_SCHOOL_COUNTRY_OPTIONS.filter((opt) => {
      if (opt.name.toLowerCase().includes(q)) return true;
      if (opt.code.toLowerCase().includes(q)) return true;
      if (opt.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      const timer = setTimeout(() => searchInputRef.current?.focus(), 20);
      return () => {
        clearTimeout(timer);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
    return undefined;
  }, [open]);

  const handleSelect = (opt: CountryOption) => {
    onChange(opt.name, opt.code);
    setOpen(false);
    setQuery("");
  };

  const displayLabel = selectedOption?.name || value.trim();
  const displayCode = selectedOption?.code || countryCode || "";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border rounded-xl text-xs text-left transition-colors focus:bg-white focus:outline-none shadow-2xs ${
          error
            ? "border-red-400 focus:border-red-500"
            : open
            ? "border-blue-500 bg-white ring-2 ring-blue-500/15"
            : "border-slate-200 hover:border-slate-300 focus:border-blue-500"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {displayLabel ? (
            <>
              <FlagPreview code={displayCode} name={displayLabel} />
              <span className="font-medium text-slate-900 truncate">{displayLabel}</span>
            </>
          ) : (
            <>
              <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400">{placeholder}</span>
            </>
          )}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
        >
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 54 African countries..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500">
                No matching country found.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected =
                  (displayCode && opt.code === displayCode) ||
                  (displayLabel && opt.name.toLowerCase() === displayLabel.toLowerCase());
                const isOther = opt.code === OTHER_COUNTRY_CODE;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    role="option"
                    aria-selected={Boolean(isSelected)}
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-left transition-colors ${
                      isSelected
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : isOther
                        ? "text-slate-600 hover:bg-slate-50 border-t border-slate-100"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <FlagPreview code={opt.code} name={opt.name} />
                      <span className="truncate">{opt.name}</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {!isOther && (
                        <span className="text-[10px] font-mono text-slate-400">{opt.code}</span>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
