"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FileText, LogOut, Upload, CheckCircle2 } from "lucide-react";

export default function ApplicantDashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email || "");
    }
    loadUser();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between pb-6 border-b border-[#E8EAF3]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#D97706] text-white flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0E1045]">Admissions Applicant Portal</h1>
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
          <FileText className="h-6 w-6 text-[#5D61EF] mb-3" />
          <h2 className="text-sm font-bold text-[#0E1045]">Admission Application</h2>
          <p className="text-xs text-[#606798] mt-1">Review application details & chosen programmes.</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E8EAF3] shadow-sm">
          <Upload className="h-6 w-6 text-[#16A34A] mb-3" />
          <h2 className="text-sm font-bold text-[#0E1045]">Document Uploads</h2>
          <p className="text-xs text-[#606798] mt-1">Upload verified transcripts, certificates and ID.</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-[#E8EAF3] shadow-sm">
          <CheckCircle2 className="h-6 w-6 text-[#D97706] mb-3" />
          <h2 className="text-sm font-bold text-[#0E1045]">Decision & Offer</h2>
          <p className="text-xs text-[#606798] mt-1">Track admission review status and offer acceptance.</p>
        </div>
      </div>
    </div>
  );
}

