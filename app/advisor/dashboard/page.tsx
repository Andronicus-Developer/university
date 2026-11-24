"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOutUser } from "@/lib/auth/signout";
import { useFeatureFlags } from "@/lib/superadmin/useFeatureFlags";
import { UserCheck, LogOut, Users, Activity, MessageSquare } from "lucide-react";

export default function AdvisorDashboardPage() {
  const router = useRouter();
  const { loaded: flagsLoaded, isEnabled } = useFeatureFlags();
  const [email, setEmail] = useState("");
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.replace("/login?redirectedFrom=" + encodeURIComponent(window.location.pathname));
        return;
      }
      const normEmail = (user.email || "").trim().toLowerCase();
      setIsSuperAdminUser(
        normEmail === "superadmin@university.edu.gh" ||
          user.app_metadata?.role === "superadmin"
      );
      setEmail(user.email || "");
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (!flagsLoaded || isSuperAdminUser) return;
    if (!isEnabled("advisor_portal")) {
      router.replace(
        "/portal-unavailable?portal=Academic%20Advisor%20Portal&key=advisor_portal&from=%2Fadvisor%2Fdashboard"
      );
    }
  }, [flagsLoaded, isSuperAdminUser, isEnabled, router]);

  const handleSignOut = async () => {
    await signOutUser("/login");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between pb-6 border-b border-[#E8EAF3]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#9333EA] text-white flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0E1045]">Academic Advising Workspace</h1>
            <p className="text-xs text-[#606798]">{email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8EAF3] bg-white hover:bg-[#F4F5FB] text-xs font-semibold text-[#0E1045] transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 text-[#D32F2F]" />
          Sign Out
        </button>
      </header>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-[#E8EAF3] shadow-sm">
          <Users className="h-6 w-6 text-[#5D61EF] mb-3" />
          <h2 className="text-sm font-bold text-[#0E1045]">Assigned Advisees</h2>
          <p className="text-xs text-[#606798] mt-1">Student cohorts and registered course loads.</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E8EAF3] shadow-sm">
          <Activity className="h-6 w-6 text-[#16A34A] mb-3" />
          <h2 className="text-sm font-bold text-[#0E1045]">Progression & Standing</h2>
          <p className="text-xs text-[#606798] mt-1">Monitor at-risk students and credit loads.</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E8EAF3] shadow-sm">
          <MessageSquare className="h-6 w-6 text-[#D97706] mb-3" />
          <h2 className="text-sm font-bold text-[#0E1045]">Advising Case Notes</h2>
          <p className="text-xs text-[#606798] mt-1">Confidential advising notes and student cases.</p>
        </div>
      </div>
    </div>
  );
}

