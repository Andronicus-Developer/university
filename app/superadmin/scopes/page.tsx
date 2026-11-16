"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Building2,
  Plus,
  Search,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface ScopeItem {
  id: string;
  name: string;
  scopeType: "Campus" | "Faculty" | "Department" | "Cohort";
  institution: string;
  assignedUsersCount: number;
  description: string;
}

export default function DepartmentCampusScopesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const scopes: ScopeItem[] = [
    {
      id: "sc-1",
      name: "Main Campus (Cantonments, Accra)",
      scopeType: "Campus",
      institution: "Accra Institute of Technology",
      assignedUsersCount: 14,
      description: "Primary administrative campus with central lecture halls, registry, and hostels.",
    },
    {
      id: "sc-2",
      name: "Faculty of Computing & Information Systems",
      scopeType: "Faculty",
      institution: "Accra Institute of Technology",
      assignedUsersCount: 8,
      description: "Houses Computer Science, Software Engineering, and Information Technology programmes.",
    },
    {
      id: "sc-3",
      name: "Department of Computer Science",
      scopeType: "Department",
      institution: "Accra Institute of Technology",
      assignedUsersCount: 5,
      description: "BSc Computer Science and MSc Artificial Intelligence course offerings.",
    },
    {
      id: "sc-4",
      name: "School of Business & Administration",
      scopeType: "Faculty",
      institution: "Accra Institute of Technology",
      assignedUsersCount: 6,
      description: "Houses Business Administration, Accounting, and Marketing departments.",
    },
  ];

  const filtered = scopes.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.scopeType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.institution.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* Sub-Header: Breadcrumbs + Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link
            href="/superadmin/dashboard"
            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            Super Admin
          </Link>
          <span className="text-slate-300">/</span>
          <span>Core Administration</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">Department & Campus Scopes</span>
        </div>

        <button
          onClick={() => alert("Add Scope Modal")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Define New Scope</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search scope, type, campus..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>
        <span className="text-xs text-slate-500">
          Hierarchical multi-campus and faculty authorization boundaries
        </span>
      </div>

      {/* Scopes Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Scope Identifier</th>
                <th className="py-3 px-4">Scope Type</th>
                <th className="py-3 px-4">Institution Context</th>
                <th className="py-3 px-4">Assigned Personnel</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        <div className="text-[10.5px] text-slate-500">{s.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      {s.scopeType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">{s.institution}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900">{s.assignedUsersCount} users</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Managing scope: ${s.name}`)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
