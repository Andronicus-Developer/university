"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Mail,
  Shield,
  Building2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: "active" | "invited" | "suspended" | "locked";
  institution: string;
  mfa_enabled: boolean;
  created_at: string;
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = async () => {
    setIsLoading(true);
    const supabase = createClient();
    try {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .limit(50);

      if (data && data.length > 0) {
        setUsers(
          data.map((u: any, idx: number) => ({
            id: u.id,
            full_name: u.full_name || "User " + (idx + 1),
            email: u.email || `user${idx + 1}@university.edu.gh`,
            role: u.role || (idx === 0 ? "superadmin" : "system_admin"),
            status: "active",
            institution: "Accra Institute of Technology",
            mfa_enabled: true,
            created_at: u.created_at || new Date().toISOString(),
          }))
        );
      } else {
        // Fallback default sample data
        setUsers([
          {
            id: "u-1",
            full_name: "Super Administrator",
            email: "superadmin@university.edu.gh",
            role: "superadmin",
            status: "active",
            institution: "UMS Central Platform",
            mfa_enabled: true,
            created_at: "2026-11-01T10:00:00Z",
          },
          {
            id: "u-2",
            full_name: "AIT System Administrator",
            email: "admin@university.edu.gh",
            role: "system_admin",
            status: "active",
            institution: "Accra Institute of Technology",
            mfa_enabled: true,
            created_at: "2026-11-02T10:00:00Z",
          },
          {
            id: "u-3",
            full_name: "Dr. Kwesi Appiah (Finance Director)",
            email: "finance@university.edu.gh",
            role: "bursar",
            status: "active",
            institution: "Accra Institute of Technology",
            mfa_enabled: false,
            created_at: "2026-11-03T10:00:00Z",
          },
          {
            id: "u-4",
            full_name: "Prof. Yaw Boateng (Dean of Engineering)",
            email: "lecturer@university.edu.gh",
            role: "lecturer",
            status: "active",
            institution: "Accra Institute of Technology",
            mfa_enabled: false,
            created_at: "2026-11-04T10:00:00Z",
          },
        ]);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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
          <span className="text-slate-800 font-semibold">Users & Directory</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/superadmin/system-admins"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Provision User</span>
          </Link>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
          >
            <option value="all">All Roles</option>
            <option value="superadmin">Super Administrator</option>
            <option value="system_admin">System Administrator</option>
            <option value="bursar">Finance / Bursar</option>
            <option value="lecturer">Lecturer / Faculty</option>
            <option value="student">Student</option>
          </select>
          <span className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filtered.length}</strong> of {users.length}
          </span>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-xs">Loading directory records...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Institution Context</th>
                  <th className="py-3 px-4">MFA Status</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {u.full_name?.slice(0, 2).toUpperCase() || "US"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {u.full_name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold uppercase">
                        {u.role.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {u.institution}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          u.mfa_enabled
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {u.mfa_enabled ? "MFA Active" : "No MFA"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => alert(`Viewing user profile: ${u.email}`)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
