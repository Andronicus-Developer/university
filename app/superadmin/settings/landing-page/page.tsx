"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sliders } from "lucide-react";
import { LandingPageEditor } from "@/components/superadmin/LandingPageEditor";

export default function SuperAdminLandingPageSettingsRoute() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Link
            href="/superadmin/dashboard"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Super Admin
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <Link
            href="/superadmin/settings"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            System Settings
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="text-slate-800 dark:text-slate-100 font-semibold">
            Landing Page Content
          </span>
        </div>

        <Link
          href="/superadmin/settings"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to All Settings</span>
          <Sliders className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
        </Link>
      </div>

      <LandingPageEditor />
    </div>
  );
}
