"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, Loader2, LogOut, Sparkles } from "lucide-react";
import { ErudianLogo } from "@/components/brand/ErudianLogo";
import { signOutUser } from "@/lib/auth/signout";
import {
  findDisabledFlagForPath,
  getFeatureFlagDefinition,
} from "@/lib/superadmin/feature-flags-catalog";

function DynamicPortalSubtitle() {
  const searchParams = useSearchParams();
  const portalKey = searchParams?.get("key") || "";
  const rawPortalName = searchParams?.get("portal") || "";
  const fromPath = searchParams?.get("from") || "";

  const matchedDef = getFeatureFlagDefinition(portalKey);
  const portalName = rawPortalName || matchedDef?.label || "This Portal";

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
        {portalName} Is Currently Unavailable
      </h1>

      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
        Your school administrator or platform team has not enabled{" "}
        <strong className="text-slate-900">{portalName}</strong> yet. Please check
        back later or contact your institution&apos;s administrator if you believe
        you should have access.
      </p>

      {fromPath && (
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500">
          Requested path:{" "}
          <span className="font-mono font-semibold text-slate-700 break-all">
            {fromPath}
          </span>
        </div>
      )}
    </div>
  );
}

function DefaultPortalSubtitle() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
        Portal Currently Unavailable
      </h1>
      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
        Your school administrator or platform team has not enabled this portal
        yet. Please check back later or contact your institution&apos;s
        administrator if you believe you should have access.
      </p>
    </div>
  );
}

export default function PortalUnavailablePage() {
  const [checkingSession, setCheckingSession] = useState<boolean>(true);
  const [availableDashboard, setAvailableDashboard] = useState<string | null>(
    null
  );
  const [userEmail, setUserEmail] = useState<string>("");
  const [signingOut, setSigningOut] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    async function resolveAlternativeDashboard() {
      try {
        const [meRes, flagsRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/public/feature-flags", { cache: "no-store" }),
        ]);

        if (!active) return;

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData?.authenticated) {
            setUserEmail(meData.user?.email || "");
            const target = String(meData.targetDashboard || "");
            const roles = Array.isArray(meData.roles) ? meData.roles : [];
            const isSuperAdmin =
              roles.includes("superadmin") ||
              String(meData.user?.email || "").toLowerCase() ===
                "superadmin@university.edu.gh";

            if (isSuperAdmin) {
              setAvailableDashboard("/superadmin/dashboard");
            } else if (target) {
              const flagsBody = flagsRes.ok ? await flagsRes.json() : {};
              const flagMap = flagsBody?.flags || {};
              const blocked = findDisabledFlagForPath(target, flagMap);
              if (!blocked) {
                setAvailableDashboard(target);
              }
            }
          }
        }
      } catch {
        // Ignore network errors
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    resolveAlternativeDashboard();
    return () => {
      active = false;
    };
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutUser("/login");
    } catch {
      window.location.replace("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] via-[#F3EFFE] to-[#EFF6FF] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-purple-100 shadow-[0_20px_60px_rgba(15,23,42,0.08)] p-7 sm:p-9 text-center space-y-6">
        <div className="flex justify-center">
          <Link href="/" aria-label="Erudian360 Home">
            <ErudianLogo size="md" />
          </Link>
        </div>

        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-50 to-purple-50 border border-purple-200/70 text-[#7C3AED] flex items-center justify-center mx-auto shadow-xs">
          <Clock className="h-8 w-8" />
        </div>

        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-[#7C3AED] text-[11px] font-bold">
            <Sparkles className="h-3 w-3" />
            <span>Portal Coming Soon / Currently Unavailable</span>
          </span>

          <Suspense fallback={<DefaultPortalSubtitle />}>
            <DynamicPortalSubtitle />
          </Suspense>
        </div>

        <div className="space-y-2.5 pt-1">
          {!checkingSession && availableDashboard && (
            <button
              type="button"
              onClick={() => window.location.assign(availableDashboard)}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Available Portal</span>
            </button>
          )}

          {userEmail ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full py-3 px-4 rounded-xl bg-[#0F0F14] hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {signingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 text-amber-300" />
                  <span>Sign Out &amp; Switch Account ({userEmail})</span>
                </>
              )}
            </button>
          ) : (
            <Link
              href="/login"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Go to Sign In</span>
            </Link>
          )}

          <Link
            href="/"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
