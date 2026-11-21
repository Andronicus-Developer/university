"use client";

import React, { useState } from "react";
import { Hammer, Wrench, ShieldCheck, Award, Briefcase, Check, Users, AlertTriangle } from "lucide-react";

export default function TeacherWorkshopsPage() {
  const [stations] = useState([
    { id: "s1", name: "Station 1: Automotive Engine Lab", head: "Master Kwarteng", capacity: 12, occupied: 10, task: "Electronic Fuel Injection (EFI) Diagnostic Scanning" },
    { id: "s2", name: "Station 2: Domestic & Solar Wiring", head: "Master Boateng", capacity: 15, occupied: 14, task: "Dual Inverter Grid Synchronization & Conduit Bending" },
    { id: "s3", name: "Station 3: Gas & Arc Welding Bay", head: "Master Appiah", capacity: 8, occupied: 8, task: "Shielded Metal Arc Butt-Joint Welding (NVTI Level I)" },
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Technical & Vocational Practical Training
            </span>
            <span className="text-xs text-slate-400">NVTI / NABPTEX Accredited</span>
          </div>
          <h1 className="text-xl font-black text-slate-900">Workshops, Tool Safety & Industrial Attachment</h1>
          <p className="text-xs text-slate-500">
            Oversee workshop practical bays, tool checkout logs, and external apprentice placements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>PPE Safety: 100% Verified</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stations.map((st) => (
          <div key={st.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                {st.name.split(":")[0]}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {st.occupied} / {st.capacity} Trainees
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">{st.name.split(":")[1]}</h3>
            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800">Active Task:</span> {st.task}
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Lead: {st.head}</span>
              <button className="text-amber-800 font-bold hover:underline cursor-pointer">
                Inspection Sign-off
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
