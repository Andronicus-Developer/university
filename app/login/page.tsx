"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LoginIllustration } from "@/app/components/LoginIllustration";
import { ErudianLogo } from "@/components/brand/ErudianLogo";
import { findDisabledFlagForPath } from "@/lib/superadmin/feature-flags-catalog";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = username.trim();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message || "Invalid credentials. Please verify your email and password.");
        setIsLoading(false);
        return;
      }

      if (data?.user) {
        const normalizedEmail = (data.user.email || "").trim().toLowerCase();
        const isRootSuperAdmin =
          normalizedEmail === "superadmin@university.edu.gh" ||
          data.user.app_metadata?.role === "superadmin";

        let resolvedUserSchoolId: string | null =
          (data.user.app_metadata as any)?.school_id ||
          (data.user.app_metadata as any)?.university_id ||
          (data.user.user_metadata as any)?.school_id ||
          (data.user.user_metadata as any)?.university_id ||
          null;

        // Live School & Account Status Guard: Block suspended/deleted accounts and suspended/inactive schools immediately
        if (!isRootSuperAdmin) {
          try {
            let { data: profile } = await (supabase as any)
              .from("profiles")
              .select("account_status, metadata, school_id, university_id")
              .eq("id", data.user.id)
              .maybeSingle();

            if (!profile && normalizedEmail) {
              try {
                const { data: profByEmail } = await (supabase as any)
                  .from("profiles")
                  .select("account_status, metadata, school_id, university_id")
                  .ilike("email", normalizedEmail)
                  .maybeSingle();
                if (profByEmail) profile = profByEmail;
              } catch {}
            }

            if (
              profile &&
              ["suspended", "deleted"].includes(String(profile.account_status || "").toLowerCase())
            ) {
              await supabase.auth.signOut();
              setErrorMessage("Access Denied: Your user account has been suspended or decommissioned.");
              setIsLoading(false);
              return;
            }

            const userSchoolId =
              profile?.school_id ||
              profile?.university_id ||
              profile?.metadata?.school_id ||
              profile?.metadata?.university_id ||
              (data.user.user_metadata as any)?.school_id ||
              (data.user.user_metadata as any)?.university_id;

            if (userSchoolId) {
              resolvedUserSchoolId = String(userSchoolId);
              const { data: schoolRow } = await (supabase as any)
                .from("schools")
                .select("id, status, name")
                .eq("id", resolvedUserSchoolId)
                .maybeSingle();

              const schoolStatus = String(schoolRow?.status || "").toLowerCase();
              if (["suspended", "inactive", "deleted"].includes(schoolStatus)) {
                await supabase.auth.signOut();
                setErrorMessage(
                  `Access Denied: ${schoolRow?.name || "Your school"} is currently ${schoolStatus}. Contact your Super Administrator.`
                );
                setIsLoading(false);
                return;
              }
            }
          } catch (guardErr) {
            console.warn("Could not check school/account status during sign in:", guardErr);
          }
        }

        const metaRole =
          data.user.user_metadata?.role ||
          data.user.user_metadata?.default_role ||
          (data.user.email === "admin@university.edu.gh" ? "system_admin" : undefined);

        let rpcRoles: string[] = [];
        if (!metaRole) {
          try {
            const { data: userRoles } = await supabase.rpc("get_user_roles", {
              p_user_id: data.user.id,
            });
            rpcRoles = (userRoles || []).map((r: { role_code: string }) => r.role_code);
          } catch {
            // Fallback to metadata role if RPC fails
          }
        }

        const roles: string[] = Array.from(new Set([...rpcRoles, ...(metaRole ? [metaRole] : [])]));

        // Determine target portal based on role
        let targetPath = "/admin/dashboard";
        const isSuperAdmin =
          data.user.email?.trim().toLowerCase() === "superadmin@university.edu.gh" ||
          data.user.app_metadata?.role === "superadmin" ||
          rpcRoles.includes("superadmin");

        const isSystemAdmin =
          isSuperAdmin ||
          roles.includes("system_admin") ||
          data.user.email === "admin@university.edu.gh";

        const isFinanceStaff =
          roles.includes("finance_officer") ||
          roles.includes("bursar") ||
          roles.includes("accountant");

        const isAdminStaff =
          isSystemAdmin ||
          roles.some((r) =>
            [
              "vice_chancellor",
              "registrar",
              "academic_affairs_officer",
              "dean",
              "head_of_department",
              "admissions_officer",
              "librarian",
              "hostel_officer",
              "hr_officer",
              "auditor",
            ].includes(r)
          );

        if (isSuperAdmin) {
          targetPath = "/superadmin/dashboard";
        } else if (isFinanceStaff && !isSystemAdmin) {
          targetPath = "/finance/dashboard";
        } else if (
          !isSystemAdmin &&
          (roles.includes("registrar") || roles.includes("academic_affairs_officer"))
        ) {
          targetPath = "/registrar/dashboard";
        } else if (isAdminStaff) {
          targetPath = "/admin/dashboard";
        } else if (roles.includes("teacher") || roles.includes("instructor")) {
          targetPath = "/teacher/dashboard";
        } else if (roles.includes("parent") || roles.includes("parent_sponsor") || roles.includes("guardian")) {
          targetPath = "/parent/dashboard";
        } else if (roles.includes("lecturer")) {
          targetPath = "/lecturer/dashboard";
        } else if (roles.includes("student")) {
          targetPath = "/student/dashboard";
        } else if (roles.includes("applicant")) {
          targetPath = "/applicant/dashboard";
        } else if (roles.includes("academic_advisor")) {
          targetPath = "/advisor/dashboard";
        } else if (isFinanceStaff) {
          targetPath = "/finance/dashboard";
        }

        // Honor ?redirectedFrom= if it is a safe internal path matching the user's portal
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const redirectedFrom = params.get("redirectedFrom");
          if (
            redirectedFrom &&
            redirectedFrom.startsWith("/") &&
            !/^\/[\\\/]/.test(redirectedFrom) &&
            !redirectedFrom.includes("://") &&
            redirectedFrom !== "/" &&
            redirectedFrom !== "/unauthorized" &&
            redirectedFrom !== "/portal-unavailable" &&
            redirectedFrom !== "/login"
          ) {
            const allowsRedirect =
              isSuperAdmin ||
              (isAdminStaff && !redirectedFrom.startsWith("/superadmin")) ||
              redirectedFrom.startsWith(`/${targetPath.split("/")[1]}`);
            if (allowsRedirect) {
              targetPath = redirectedFrom;
            }
          }

          // Check platform portal feature flags for non-superadmin users
          if (!isSuperAdmin) {
            try {
              const qs = resolvedUserSchoolId
                ? `?schoolId=${encodeURIComponent(resolvedUserSchoolId)}`
                : "";
              const ffRes = await fetch(`/api/public/feature-flags${qs}`, {
                cache: "no-store",
              });
              if (ffRes.ok) {
                const ffBody = await ffRes.json();
                if (ffBody?.flags) {
                  const blocked = findDisabledFlagForPath(targetPath, ffBody.flags);
                  if (blocked) {
                    targetPath = `/portal-unavailable?portal=${encodeURIComponent(
                      blocked.label
                    )}&key=${encodeURIComponent(
                      blocked.portal_key
                    )}&from=${encodeURIComponent(targetPath)}`;
                  }
                }
              }
            } catch {
              // Non-blocking fallback (middleware also enforces access)
            }
          }

          // Full navigation ensures fresh auth cookies are sent and bypasses any prefetched unauthenticated redirect cache
          window.location.assign(targetPath);
          return;
        }

        router.push(targetPath);
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred. Please try again."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-full overflow-hidden bg-gradient-to-br from-[#090D24] via-[#1E3A8A] to-[#2563EB] dark:from-[#030712] dark:via-[#0F172A] dark:to-[#1E1B4B] flex items-center justify-center p-3 sm:p-5 lg:p-6 select-none font-sans">
      {/* Centered Card Wrapper */}
      <div className="relative w-full max-w-[1000px] h-[min(620px,calc(100vh-1.5rem))] lg:aspect-[910/647] flex items-center justify-center">
        {/* Outer portions of the 3 straddling isometric parallelograms */}
        <svg
          viewBox="0 0 910 647"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="pointer-events-none hidden lg:block absolute inset-0 h-full w-full overflow-visible z-0"
          aria-hidden="true"
        >
          <g transform="matrix(1, -0.5, 0, 1, 846, 54)">
            <rect x="0" y="0" width="112" height="88" rx="12" fill="#1E3A8A" opacity="0.85" />
          </g>
          <g transform="matrix(1, -0.5, 0, 1, -45, 565)">
            <rect x="0" y="0" width="107" height="70" rx="10" fill="#172554" opacity="0.9" />
          </g>
          <g transform="matrix(1, -0.5, 0, 1, 555, 612)">
            <rect x="0" y="0" width="136" height="106" rx="13" fill="#1E40AF" opacity="0.8" />
          </g>
          <g transform="matrix(1, -0.5, 0, 1, 541, 638)">
            <rect x="0" y="0" width="66" height="58" rx="9" fill="#2563EB" opacity="0.75" />
          </g>
        </svg>

        {/* Main White-to-Soft-Ice-Blue Rounded Card */}
        <main
          className="relative z-10 w-full h-full overflow-hidden rounded-[24px] sm:rounded-[32px] lg:rounded-[36px] shadow-[0_25px_60px_rgba(2,6,23,0.45)] flex flex-col lg:flex-row items-center border border-white/20 dark:border-slate-700/80 bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFFFF_52%,#F8FAFC_68%,#EFF6FF_86%,#DBEAFE_100%)] dark:bg-[linear-gradient(180deg,#0F172A_0%,#0F172A_55%,#1E293B_100%)]"
        >
          <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-30">
            <ThemeToggle variant="compact" align="right" />
          </div>

          {/* Inner portions of the parallelograms */}
          <svg
            viewBox="0 0 910 647"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="pointer-events-none hidden lg:block absolute inset-0 h-full w-full z-0 dark:opacity-15"
            aria-hidden="true"
          >
            <g transform="matrix(1, -0.5, 0, 1, 846, 54)">
              <rect x="0" y="0" width="112" height="88" rx="12" fill="#EFF6FF" />
            </g>
            <g transform="matrix(1, -0.5, 0, 1, -45, 565)">
              <rect x="0" y="0" width="107" height="70" rx="10" fill="#DBEAFE" />
            </g>
            <g transform="matrix(1, -0.5, 0, 1, 541, 638)">
              <rect x="0" y="0" width="66" height="58" rx="9" fill="#BFDBFE" />
            </g>
            <g transform="matrix(1, -0.5, 0, 1, 555, 612)">
              <rect x="0" y="0" width="136" height="106" rx="13" fill="#DBEAFE" />
            </g>
          </svg>

          {/* Left Column: Isometric Illustration */}
          <div className="relative z-10 w-full lg:w-[57%] h-full flex items-center justify-center p-2 lg:p-4 overflow-hidden">
            <LoginIllustration className="w-full h-full max-h-[500px] object-contain" />
          </div>

          {/* Right Column: Login Form */}
          <div className="relative z-10 w-full lg:w-[43%] h-full flex flex-col justify-center px-6 lg:pl-3 lg:pr-8 py-3 overflow-hidden">
            <div className="w-full max-w-[320px] lg:max-w-[305px] xl:max-w-[325px] mx-auto lg:mx-0">
              {/* Same Erudian360 Brand Logo Design as Landing Page */}
              <div className="mb-1">
                <Link href="/" className="inline-flex items-center group" title="Return to Erudian360 home">
                  <ErudianLogo size="lg" />
                </Link>
              </div>
              <p className="text-[11.5px] font-medium text-slate-500 mt-1">
                Sign in to your institutional workspace
              </p>

              {/* Error Alert */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11.5px] font-medium leading-tight"
                >
                  {errorMessage}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-4 lg:mt-5 space-y-4">
                {/* Username or email */}
                <div>
                  <input
                    type="email"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username or email"
                    autoComplete="username"
                    aria-label="Username or email"
                    required
                    className="w-full bg-transparent pb-2 text-[13px] font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-medium border-b-[1.5px] border-slate-200 dark:border-slate-700 focus:border-[#7C3AED] focus:outline-none transition-colors"
                  />
                </div>

                {/* Password */}
                <div>
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    aria-label="Password"
                    required
                    className="w-full bg-transparent pb-2 text-[13px] font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-medium border-b-[1.5px] border-slate-200 dark:border-slate-700 focus:border-[#7C3AED] focus:outline-none transition-colors"
                  />
                </div>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer"
                    />
                    <span className="hover:text-slate-900 transition-colors">
                      Remember me
                    </span>
                  </label>

                  <a
                    href="#forgot-password"
                    onClick={(e) => e.preventDefault()}
                    className="text-blue-600 hover:text-blue-800 transition-colors font-semibold"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 active:scale-[0.99] text-white text-xs font-semibold tracking-wide shadow-sm shadow-blue-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        ></path>
                      </svg>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Login</span>
                  )}
                </button>
              </form>

              {/* Back to Landing Page */}
              <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between text-[11.5px]">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-semibold transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Landing Page</span>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
