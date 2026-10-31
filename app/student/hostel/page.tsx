"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Home,
  CheckCircle2,
  Calendar,
  AlertCircle,
  MapPin,
  Users,
  ShieldCheck,
  Wrench,
} from "lucide-react";

export default function StudentHostelPage() {
  const [allocation, setAllocation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHostel() {
      setLoading(true);
      const supabase = createClient();
      const db = supabase as any;

      try {
        const { data: { user } } = await supabase.auth.getUser();

        let stuId = null;
        if (user) {
          const { data: stu } = await db
            .from("students")
            .select("id")
            .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();
          if (stu) stuId = stu.id;
        }

        if (!stuId) {
          const { data: firstStu } = await db.from("students").select("id").limit(1).maybeSingle();
          if (firstStu) stuId = firstStu.id;
        }

        if (stuId) {
          const { data: alloc } = await db
            .from("allocations")
            .select(`
              id,
              status,
              allocated_at,
              check_in_at,
              bed:bed_id(
                bed_number,
                room:hostel_room_id(
                  room_number,
                  floor_number,
                  room_type,
                  max_occupancy,
                  residence:residence_id(name, address, gender_allocation)
                )
              )
            `)
            .eq("student_id", stuId)
            .maybeSingle();

          setAllocation(alloc);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadHostel();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading hostel allocation records...</p>
      </div>
    );
  }

  const room = allocation?.bed?.room;
  const residence = room?.residence;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hostel & Accommodation Portal</h1>
          <p className="text-xs text-slate-500">Hall of residence allocation, room assignment and residency details</p>
        </div>
        <button
          onClick={() => alert("Maintenance request form opened for Hall Porter.")}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition self-start"
        >
          <Wrench className="h-3.5 w-3.5" /> Report Room Issue
        </button>
      </div>

      {allocation ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Official On-Campus Residence
                </span>
                <h2 className="text-2xl font-black text-slate-900">{residence?.name || "Jean Nelson Hall"}</h2>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                  {residence?.address || "Main Campus Residential Enclave, University of Ghana"}
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs self-start sm:self-center">
                Allocation Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 block">Room Number</span>
                <p className="text-base font-bold text-slate-900">{room?.room_number || "B-204"}</p>
                <span className="text-[10px] text-slate-500">Floor: {room?.floor_number || 2}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 block">Bed Assignment</span>
                <p className="text-base font-bold text-slate-900">{allocation?.bed?.bed_number || "Bed 1"}</p>
                <span className="text-[10px] text-slate-500">Room Type: {room?.room_type || "Double"}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-slate-400 block">Official Check-in</span>
                <p className="text-base font-bold text-emerald-600">01 Sep 2026</p>
                <span className="text-[10px] text-slate-500">Term: First Semester</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Residential Hall Guidelines</h3>
            <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
              <li>Quiet hours are strictly observed between 10:00 PM and 6:00 AM.</li>
              <li>Electrical cooking appliances are restricted to hall kitchenettes.</li>
              <li>Visitors must sign in at the porter's lodge.</li>
              <li>Report room maintenance requests promptly.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
          No active hostel allocation found for this semester.
        </div>
      )}
    </div>
  );
}

