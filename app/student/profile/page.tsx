"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  ShieldCheck,
  Building,
  Edit3,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Hash,
  School,
  Save,
} from "lucide-react";

export default function StudentProfilePage() {
  const [student, setStudent] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let stuRecord = null;
      if (user) {
        const { data: stu } = await db
          .from("students")
          .select("*, profile:profile_id(*), programme:programme_id(*, department:department_id(name))")
          .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
          .maybeSingle();
        stuRecord = stu;
      }

      if (!stuRecord) {
        const { data: firstStu } = await db
          .from("students")
          .select("*, profile:profile_id(*), programme:programme_id(*, department:department_id(name))")
          .limit(1)
          .maybeSingle();
        stuRecord = firstStu;
      }

      if (stuRecord) {
        setStudent(stuRecord);
        setProfile(stuRecord.profile || {});
        setPhone(stuRecord.profile?.phone || "+233 24 555 0192");
        setAddress(stuRecord.profile?.address || "University Hall Annex, Room B-204, Main Campus");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveContact = async () => {
    if (!profile?.id) return;
    setSaving(true);
    setSuccessMsg("");
    try {
      const supabase = createClient();
      const db = supabase as any;

      await db
        .from("profiles")
        .update({
          phone: phone,
          address: address,
        })
        .eq("id", profile.id);

      setSuccessMsg("Contact information updated successfully.");
      setEditing(false);
      fetchProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading student profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Profile & Biodata</h1>
          <p className="text-xs text-slate-500">Official student registry record, contact details and academic status</p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs self-start"
        >
          <Edit3 className="h-3.5 w-3.5" />
          {editing ? "Cancel Edit" : "Update Contact Info"}
        </button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Main Profile Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Identity Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6 flex flex-col items-center text-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-blue-500/20">
              {profile?.full_name ? profile.full_name.charAt(0) : "S"}
            </div>
            <span className="absolute bottom-0 right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Active Standing">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">{profile?.full_name || "Ama Johnson"}</h2>
            <p className="text-xs font-semibold text-blue-600">{student?.student_number || "STU20260001"}</p>
            <p className="text-xs text-slate-500">{student?.programme?.name || "BSc Computer Science"}</p>
          </div>

          <div className="w-full pt-4 border-t border-slate-100 space-y-2.5 text-xs text-left">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Enrolment Status:</span>
              <span className="font-bold text-emerald-600 capitalize">{student?.status || "Enrolled"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Academic Level:</span>
              <span className="font-bold text-slate-800">Level {student?.current_level || 100}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Cumulative GPA:</span>
              <span className="font-bold text-slate-800">{student?.cgpa ? Number(student.cgpa).toFixed(2) : "3.84"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Total Credits:</span>
              <span className="font-bold text-slate-800">{student?.total_credits_earned || 36} Credits</span>
            </div>
          </div>
        </div>

        {/* Right: Bio & Contact Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
              <User className="h-4 w-4 text-blue-600" />
              <span>Bio & Contact Information</span>
            </div>

            {editing ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Residential Address / Hall</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleSaveContact}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving Changes..." : "Save Contact Info"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 block">Institutional Email</span>
                  <p className="font-bold text-slate-800">{profile?.email || "ama.johnson@university.edu.gh"}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-slate-400 block">Phone Number</span>
                  <p className="font-bold text-slate-800">{phone}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1 sm:col-span-2">
                  <span className="text-slate-400 block">Residential Campus Address</span>
                  <p className="font-bold text-slate-800">{address}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
              <School className="h-4 w-4 text-indigo-600" />
              <span>Academic Programme Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 block">Faculty / School</span>
                <p className="font-bold text-slate-800">School of Physical & Mathematical Sciences</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 block">Academic Department</span>
                <p className="font-bold text-slate-800">{student?.programme?.department?.name || "Department of Computer Science"}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 block">Degree Award</span>
                <p className="font-bold text-slate-800">Bachelor of Science (Honours)</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 block">Admitted Academic Year</span>
                <p className="font-bold text-slate-800">2026 / 2027 (Regular)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

