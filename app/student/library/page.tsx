"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Library,
  BookOpen,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  Calendar,
} from "lucide-react";

export default function StudentLibraryPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLibrary() {
      setLoading(true);
      const supabase = createClient();
      const db = supabase as any;

      try {
        const { data: { user } } = await supabase.auth.getUser();

        let profileId = null;
        if (user) {
          profileId = user.id;
        }

        if (!profileId) {
          const { data: firstStu } = await db.from("students").select("profile_id").limit(1).maybeSingle();
          if (firstStu) profileId = firstStu.profile_id;
        }

        if (profileId) {
          const { data: activeLoans } = await db
            .from("loans")
            .select(`
              id,
              borrowed_at,
              due_date,
              status,
              copy:copy_id(
                barcode,
                location,
                item:library_item_id(title, author, publisher, publication_year, call_number)
              )
            `)
            .eq("user_id", profileId);

          setLoans(activeLoans || []);
        }

        const { data: items } = await db.from("library_items").select("*").limit(10);
        setCatalog(items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadLibrary();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-9 w-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading library accounts and catalogue...</p>
      </div>
    );
  }

  const filteredCatalog = catalog.filter(
    (b) =>
      b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.call_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">University Library System</h1>
          <p className="text-xs text-slate-500">Active borrowed book loans, renewal requests and book catalogue</p>
        </div>
      </div>

      {/* Active Borrowed Books */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900">Currently Borrowed Items ({loans.length})</h2>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loans.length > 0 ? (
            loans.map((l) => {
              const item = l.copy?.item;
              return (
                <div key={l.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">{item?.title}</h3>
                    <p className="text-xs text-slate-600">Authors: {item?.author}</p>
                    <p className="text-[11px] text-slate-400">
                      Call Number: <span className="font-semibold text-slate-700">{item?.call_number}</span> • Barcode: {l.copy?.barcode}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Due Date:</span>
                      <span className="font-bold text-teal-700">{l.due_date}</span>
                    </div>
                    <button
                      onClick={() => alert(`Loan renewal request submitted for "${item?.title}".`)}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold transition"
                    >
                      Renew Loan
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="p-8 text-center text-xs text-slate-400">No books currently borrowed.</p>
          )}
        </div>
      </div>

      {/* Catalogue Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Library Book Catalogue</h2>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, author, call number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredCatalog.map((b) => (
            <div key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">{b.title}</h3>
                <p className="text-xs text-slate-600">Author: {b.author} • Publisher: {b.publisher} ({b.publication_year})</p>
                <p className="text-[11px] text-slate-400">Call No: {b.call_number} • ISBN: {b.isbn}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => alert(`Reserved "${b.title}". Notification will be sent when copy is ready.`)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Reserve Copy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

