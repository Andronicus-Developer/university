"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";

export default function UnauthorizedPage() {
  const router = useRouter();
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    async function loadRoles() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: roles } = await supabase.rpc("get_user_roles", {
          p_user_id: user.id,
        });
        const rpcRoles = (roles || []).map((r: { role_code: string }) => r.role_code);
        const metaRole = user.user_metadata?.role || user.user_metadata?.default_role;
        const allRoles = Array.from(new Set([...rpcRoles, ...(metaRole ? [metaRole] : [])]));
        setUserRoles(allRoles);
      }
    }
    loadRoles();
  }, []);

  const handleReturnDashboard = () => {
    if (
      userRoles.includes("system_admin") ||
      userRoles.some((r) =>
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
    } else if (userRoles.includes("lecturer")) {
      router.push("/lecturer/dashboard");
    } else if (userRoles.includes("student")) {
      router.push("/student/dashboard");
    } else if (userRoles.includes("applicant")) {
      router.push("/applicant/dashboard");
    } else if (userRoles.includes("academic_advisor")) {
      router.push("/advisor/dashboard");
    } else {
      router.push("/");
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#F4F5FB] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_12px_40px_rgba(20,24,80,0.08)] border border-[#E8EAF3] p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-[#FFF0F0] border border-[#FFD0D0] flex items-center justify-center text-[#D32F2F] mx-auto mb-5 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-black text-[#0E1045] tracking-tight">
          Access Restricted
        </h1>

        <p className="text-sm text-[#656C9E] mt-2 leading-relaxed">
          Your account role does not have permission to view the requested resource. The University Management System enforces strict least-privilege Role-Based Access Control (RBAC).
        </p>

        {userRoles.length > 0 && (
          <div className="mt-4 p-2.5 rounded-lg bg-[#F8F9FD] border border-[#EFF1FA] text-xs text-[#656C9E]">
            Current Assigned Role(s):{" "}
            <span className="font-bold text-[#5D61EF]">
              {userRoles.join(", ")}
            </span>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-2.5">
          <button
            onClick={handleReturnDashboard}
            className="w-full h-10 rounded-lg bg-[#5D61EF] hover:bg-[#5054E3] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to My Dashboard</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full h-10 rounded-lg bg-white hover:bg-[#F8F9FD] border border-[#DADBEE] text-[#424874] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-[#D32F2F]" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

