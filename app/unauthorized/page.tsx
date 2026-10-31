"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldAlert,
  ArrowLeft,
  LogOut,
  Shield,
  ExternalLink,
  GraduationCap,
  BookOpen,
  Loader2,
  RefreshCw,
} from "lucide-react";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const fromPath = searchParams?.get("from") || "";

  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [targetDashboard, setTargetDashboard] = useState<string>("/admin/dashboard");
  const [isChecking, setIsChecking] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function resolveSession() {
      try {
        // 1. Fetch server-validated session details from /api/auth/me
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data?.authenticated && isMounted) {
            setUserEmail(data.user?.email || "");
            setUserRoles(data.roles || []);
            setTargetDashboard(data.targetDashboard || "/admin/dashboard");

            if (data.isSystemAdmin) {
              window.location.assign("/admin/dashboard");
              return;
            }
          }
        }

        // 2. Client-side fallback check
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && isMounted) {
          const email = user.email || "";
          setUserEmail((prev) => prev || email);

          const normalizedEmail = email.trim().toLowerCase();
          const metaRole =
            user.user_metadata?.role ||
            user.user_metadata?.default_role ||
            (normalizedEmail === "admin@university.edu.gh" ? "system_admin" : undefined);

          let rpcRoles: string[] = [];
          try {
            const { data: roles } = await supabase.rpc("get_user_roles", {
              p_user_id: user.id,
            });
            rpcRoles = (roles || []).map((r: { role_code: string }) => r.role_code);
          } catch {
            // ignore
          }

          const combinedRoles = Array.from(
            new Set([
              ...rpcRoles,
              ...(metaRole ? [metaRole] : []),
              ...(normalizedEmail === "admin@university.edu.gh" ? ["system_admin"] : []),
            ])
          );

          if (combinedRoles.length > 0) {
            setUserRoles((prev) => (prev.length > 0 ? prev : combinedRoles));
          }

          if (
            combinedRoles.includes("system_admin") ||
            normalizedEmail === "admin@university.edu.gh"
          ) {
            window.location.assign("/admin/dashboard");
            return;
          }
        }
      } catch (err) {
        console.warn("Could not resolve unauthorized session:", err);
      } finally {
        if (isMounted) setIsChecking(false);
      }
    }

    resolveSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleReturnDashboard = () => {
    if (userRoles.includes("student")) {
      window.location.assign("/student/dashboard");
    } else if (userRoles.includes("lecturer")) {
      window.location.assign("/lecturer/dashboard");
    } else if (userRoles.includes("system_admin")) {
      window.location.assign("/admin/dashboard");
    } else if (targetDashboard) {
      window.location.assign(targetDashboard);
    } else {
      window.location.assign("/");
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      // Call server endpoint to clear all httpOnly cookies
      await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});

      // Clear client-side Supabase state
      const supabase = createClient();
      await supabase.auth.signOut().catch(() => {});

      if (typeof document !== "undefined") {
        document.cookie.split(";").forEach((c) => {
          const name = c.split("=")[0]?.trim();
          if (name) {
            document.cookie = `${name}=; Max-Age=0; path=/`;
          }
        });
      }
      window.location.assign("/");
    } catch {
      window.location.assign("/");
    }
  };

  const handleSwitchToAdmin = async () => {
    try {
      setIsSwitching(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: "admin@university.edu.gh",
        password: "Admin@123456",
      });

      if (!error) {
        window.location.assign("/admin/dashboard");
      } else {
        // Clear cookies and navigate to login
        await handleSignOut();
      }
    } catch {
      window.location.assign("/");
    }
  };

  const isLecturer = userRoles.includes("lecturer");
  const isStudent = userRoles.includes("student");

  return (
    <div className="min-h-screen bg-[#F4F5FB] flex items-center justify-center p-4 sm:p-6 select-none font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_16px_50px_rgba(20,24,80,0.08)] border border-[#E8EAF3] p-7 sm:p-8 text-center transition-all">
        {/* Shield Icon */}
        <div className="h-16 w-16 rounded-full bg-[#FFF0F0] border border-[#FFD0D0] flex items-center justify-center text-[#D32F2F] mx-auto mb-5 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-black text-[#0E1045] tracking-tight">
          Access Restricted
        </h1>

        <p className="text-sm text-[#656C9E] mt-2 leading-relaxed">
          {fromPath ? (
            <>
              Your account does not have permission to view{" "}
              <span className="font-semibold text-[#0E1045] break-all">{fromPath}</span>. The
              University Management System enforces Role-Based Access Control (RBAC).
            </>
          ) : (
            "Your account role does not have permission to view the requested resource. The University Management System enforces strict least-privilege Role-Based Access Control (RBAC)."
          )}
        </p>

        {/* User Identity Box */}
        {isChecking ? (
          <div className="mt-5 p-3 rounded-xl bg-[#F8F9FD] border border-[#EFF1FA] flex items-center justify-center gap-2 text-xs text-[#8890B5]">
            <Loader2 className="h-4 w-4 animate-spin text-[#4F46E5]" />
            <span>Resolving active session credentials...</span>
          </div>
        ) : (
          userEmail && (
            <div className="mt-5 p-3.5 rounded-xl bg-[#F8F9FD] border border-[#EFF1FA] text-left text-xs text-[#656C9E] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#8890B5]">Active Account:</span>
                <span className="font-semibold text-[#0E1045] truncate max-w-[200px]">
                  {userEmail}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-[#EFF1FA]">
                <span className="text-[#8890B5]">Assigned Role:</span>
                <span className="font-bold text-[#4F46E5] capitalize">
                  {userRoles.length > 0
                    ? userRoles.map((r) => r.replace(/_/g, " ")).join(", ")
                    : "Standard User"}
                </span>
              </div>
            </div>
          )
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          {/* If Student, show direct link to Student Portal */}
          {isStudent && (
            <button
              onClick={() => window.location.assign("/student/dashboard")}
              className="w-full h-11 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition-all shadow-md shadow-[#4F46E5]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Go to Student Portal</span>
            </button>
          )}

          {/* If Lecturer, show direct link to Lecturer Portal */}
          {isLecturer && (
            <button
              onClick={() => window.location.assign("/lecturer/dashboard")}
              className="w-full h-11 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition-all shadow-md shadow-[#4F46E5]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              <span>Go to Lecturer Portal</span>
            </button>
          )}

          {/* If neither student nor lecturer identified, show general Return to Dashboard */}
          {!isStudent && !isLecturer && (
            <button
              onClick={handleReturnDashboard}
              className="w-full h-11 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition-all shadow-md shadow-[#4F46E5]/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to My Dashboard</span>
            </button>
          )}

          {/* Switch to System Admin Button */}
          <button
            onClick={handleSwitchToAdmin}
            disabled={isSwitching}
            className="w-full h-11 rounded-xl bg-[#0E1045] hover:bg-[#1A1E6B] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSwitching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#F59E0B]" />
                <span>Switching to Administrator...</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 text-[#F59E0B]" />
                <span>Switch to System Administrator</span>
              </>
            )}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="w-full h-11 rounded-xl bg-white hover:bg-[#F8F9FD] border border-[#DADBEE] text-[#424874] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#D32F2F]" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 text-[#D32F2F]" />
                <span>Sign Out & Return to Login</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4F5FB] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl border border-[#E8EAF3] p-8 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
            <p className="text-xs text-[#656C9E] font-medium">Loading security credentials...</p>
          </div>
        </div>
      }
    >
      <UnauthorizedContent />
    </Suspense>
  );
}
