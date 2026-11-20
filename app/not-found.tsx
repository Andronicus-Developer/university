"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileQuestion, ArrowLeft, Home, LogOut, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOutUser } from "@/lib/auth/signout";

export default function NotFound() {
  const [dashboardUrl, setDashboardUrl] = useState<string>("/");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function resolveUserDashboard() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const email = user.email?.trim().toLowerCase() || "";
          const metaRole =
            user.user_metadata?.role ||
            user.user_metadata?.default_role ||
            user.app_metadata?.role;

          let roles: string[] = [];
          if (metaRole) roles.push(metaRole);
          if (email === "superadmin@university.edu.gh") roles.push("superadmin");
          if (email === "admin@university.edu.gh") roles.push("system_admin");

          try {
            const { data: rpcRoles } = await supabase.rpc("get_user_roles", {
              p_user_id: user.id,
            });
            if (Array.isArray(rpcRoles)) {
              roles.push(...rpcRoles.map((r: any) => r.role_code));
            }
          } catch {
            // fallback
          }

          roles = Array.from(new Set(roles));

          if (roles.includes("superadmin") || email === "superadmin@university.edu.gh") {
            setDashboardUrl("/superadmin/dashboard");
            setUserRole("Super Administrator");
          } else if (
            roles.includes("finance_officer") ||
            roles.includes("bursar") ||
            roles.includes("accountant")
          ) {
            setDashboardUrl("/finance/dashboard");
            setUserRole("Finance Officer");
          } else if (
            roles.includes("system_admin") ||
            roles.includes("admin") ||
            roles.some((r) =>
              [
                "vice_chancellor",
                "registrar",
                "dean",
                "head_of_department",
                "admissions_officer",
                "librarian",
                "hostel_officer",
                "hr_officer",
                "auditor",
              ].includes(r)
            )
          ) {
            setDashboardUrl("/admin/dashboard");
            setUserRole("Administrator");
          } else if (roles.includes("lecturer")) {
            setDashboardUrl("/lecturer/dashboard");
            setUserRole("Lecturer");
          } else if (roles.includes("student")) {
            setDashboardUrl("/student/dashboard");
            setUserRole("Student");
          } else if (roles.includes("advisor") || roles.includes("academic_advisor")) {
            setDashboardUrl("/advisor/dashboard");
            setUserRole("Academic Advisor");
          } else if (roles.includes("applicant")) {
            setDashboardUrl("/applicant/dashboard");
            setUserRole("Applicant");
          } else {
            setDashboardUrl("/admin/dashboard");
            setUserRole("Staff");
          }
        } else {
          setDashboardUrl("/");
          setUserRole(null);
        }
      } catch {
        setDashboardUrl("/");
      } finally {
        setIsLoading(false);
      }
    }

    resolveUserDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F5FB] flex items-center justify-center p-4 sm:p-6 select-none font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_16px_50px_rgba(20,24,80,0.08)] border border-[#E8EAF3] p-8 text-center transition-all">
        {/* 404 Illustration Badge */}
        <div className="h-20 w-20 rounded-2xl bg-[#EEF2FF] border border-[#E0E7FF] flex items-center justify-center text-[#4F46E5] mx-auto mb-5 shadow-sm">
          <FileQuestion className="h-10 w-10 text-[#4F46E5]" />
        </div>

        {/* Status Tag */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider mb-3">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Error 404</span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-black text-[#0E1045] tracking-tight">
          Page Not Found
        </h1>

        {/* Message */}
        <p className="text-sm text-[#656C9E] mt-2.5 leading-relaxed">
          The page you requested does not exist, has been relocated, or is restricted and inaccessible under your current account credentials.
        </p>

        {/* User Context Note if Logged In */}
        {!isLoading && userRole && (
          <div className="mt-5 p-3 rounded-xl bg-[#F8F9FD] border border-[#EFF1FA] text-xs text-[#656C9E] flex items-center justify-between">
            <span className="text-[#8890B5]">Current Profile:</span>
            <span className="font-bold text-[#4F46E5]">{userRole}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <Link
            href={dashboardUrl}
            className="w-full h-11 rounded-xl bg-[#0E1045] hover:bg-[#1A1E6B] text-white text-xs font-bold transition-all shadow-md shadow-[#0E1045]/15 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="h-4 w-4 text-[#F59E0B]" />
            <span>Return to Dashboard</span>
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full h-11 rounded-xl bg-[#F8F9FD] hover:bg-[#EFF1FA] border border-[#E0E2F0] text-[#0E1045] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </button>

          <button
            onClick={() => signOutUser("/")}
            className="w-full h-11 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
