"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoginIllustration } from "./components/LoginIllustration";

export default function Home() {
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
        // Query user's roles
        const { data: userRoles } = await supabase.rpc("get_user_roles", {
          p_user_id: data.user.id,
        });

        const rpcRoles = (userRoles || []).map((r: { role_code: string }) => r.role_code);
        const metaRole = data.user.user_metadata?.role || data.user.user_metadata?.default_role;
        const roles: string[] = Array.from(new Set([...rpcRoles, ...(metaRole ? [metaRole] : [])]));

        // Determine target portal based on role
        if (
          roles.includes("system_admin") ||
          roles.some((r) =>
            [
              "vice_chancellor",
              "registrar",
              "academic_affairs_officer",
              "dean",
              "head_of_department",
              "admissions_officer",
              "finance_officer",
              "librarian",
              "hostel_officer",
              "hr_officer",
              "auditor",
            ].includes(r)
          )
        ) {
          router.push("/admin/dashboard");
        } else if (roles.includes("lecturer")) {
          router.push("/lecturer/dashboard");
        } else if (roles.includes("student")) {
          router.push("/student/dashboard");
        } else if (roles.includes("applicant")) {
          router.push("/applicant/dashboard");
        } else if (roles.includes("academic_advisor")) {
          router.push("/advisor/dashboard");
        } else {
          router.push("/admin/dashboard");
        }
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred. Please try again."
      );
      setIsLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setUsername("admin@university.edu.gh");
    setPassword("Admin@123456");
    setErrorMessage(null);
  };

  return (
    <div className="h-screen max-h-screen w-full overflow-hidden bg-gradient-to-br from-[#090D24] via-[#1E3A8A] to-[#2563EB] flex items-center justify-center p-3 sm:p-5 lg:p-6 select-none font-sans">
      {/* Centered Card Wrapper */}
      <div className="relative w-full max-w-[1000px] h-[min(620px,calc(100vh-1.5rem))] lg:aspect-[910/647] flex items-center justify-center">
        {/* Outer portions of the 3 straddling isometric parallelograms (Primary Admin Blue/Navy themed) */}
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
          className="relative z-10 w-full h-full overflow-hidden rounded-[24px] sm:rounded-[32px] lg:rounded-[36px] shadow-[0_25px_60px_rgba(2,6,23,0.45)] flex flex-col lg:flex-row items-center border border-white/20"
          style={{
            background:
              "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 52%, #F8FAFC 68%, #EFF6FF 86%, #DBEAFE 100%)",
          }}
        >
          {/* Inner portions of the parallelograms */}
          <svg
            viewBox="0 0 910 647"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="pointer-events-none hidden lg:block absolute inset-0 h-full w-full z-0"
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
              {/* Heading */}
              <h1 className="text-[28px] sm:text-[32px] lg:text-[34px] font-extrabold leading-[1.2] tracking-tight text-slate-900">
                Hello,
                <br />
                Welcome back
              </h1>

              {/* Demo Admin Quick Fill Pill */}
              <div className="mt-3.5 flex items-center justify-between bg-blue-50/90 border border-blue-200/80 rounded-xl px-3 py-1.5 text-[11px] text-blue-700 shadow-2xs">
                <span className="font-semibold">Demo System Admin:</span>
                <button
                  type="button"
                  onClick={fillAdminCredentials}
                  className="font-bold underline hover:text-blue-900 transition-colors cursor-pointer"
                >
                  Quick Fill
                </button>
              </div>

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
                    className="w-full bg-transparent pb-2 text-[13px] font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium border-b-[1.5px] border-slate-200 focus:border-blue-600 focus:outline-none transition-colors"
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
                    className="w-full bg-transparent pb-2 text-[13px] font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium border-b-[1.5px] border-slate-200 focus:border-blue-600 focus:outline-none transition-colors"
                  />
                </div>

                {/* Remember me & Forgot password */}
                <div className="flex items-center justify-between text-xs font-medium text-slate-600 pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );

}
