"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BookMarked,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Book,
  Clock,
  RefreshCw,
  X,
} from "lucide-react";

interface LibraryItem {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher: string;
  publication_year: number;
}

export default function LibraryManagementPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newItem, setNewItem] = useState({
    title: "",
    author: "",
    isbn: "978-0131103627",
    category: "Computer Science",
    publisher: "University Press",
    publicationYear: 2024,
  });

  const fetchLibrary = async () => {
    setLoading(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      const { data, error } = await db
        .from("library_items")
        .select("*")
        .order("title", { ascending: true });

      if (data && data.length > 0) {
        setItems(
          data.map((item: any) => ({
            id: item.id,
            title: item.title,
            author: item.author || "Faculty Author",
            isbn: item.isbn || "N/A",
            category: item.category || "General",
            publisher: item.publisher || "Academic Publisher",
            publication_year: item.publication_year || 2024,
          }))
        );
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const db = supabase as any;

    try {
      await db.from("library_items").insert({
        title: newItem.title,
        author: newItem.author,
        isbn: newItem.isbn,
        category: newItem.category,
        publisher: newItem.publisher,
        publication_year: Number(newItem.publicationYear),
      });

      setShowAddModal(false);
      fetchLibrary();
    } catch (err) {
      console.error(err);
      setShowAddModal(false);
    } finally {
      setSaving(false);
    }
  };

  const filtered = items.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.isbn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <span className="text-[#3B82F6] hover:underline cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">Library & Resources</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            University Library & Digital Repository
          </h1>
          <p className="text-xs text-[#64748B]">
            Authoritative textbook catalog, research monographs, and loan circulations queried from database.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Catalog Item</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by book title, author, ISBN, or subject category..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#2563EB]"
          />
        </div>
        <button
          onClick={fetchLibrary}
          className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              <th className="py-3 px-4">Book Title</th>
              <th className="py-3 px-4">Author</th>
              <th className="py-3 px-4">ISBN</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Publisher</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-xs">
            {filtered.length > 0 ? (
              filtered.map((b) => (
                <tr key={b.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#1E293B]">{b.title}</td>
                  <td className="py-3.5 px-4 text-[#475569]">{b.author}</td>
                  <td className="py-3.5 px-4 font-mono text-[#64748B]">{b.isbn}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB]">
                      {b.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#64748B]">{b.publisher} ({b.publication_year})</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Issue book loan for: ${b.title}`)}
                      className="px-2.5 py-1 rounded-lg bg-[#F1F5F9] hover:bg-[#E2E8F0] text-xs font-semibold text-[#334155]"
                    >
                      Issue Loan
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-[#94A3B8]">
                  {loading
                    ? "Reading library database records..."
                    : "No resources found in database. Click 'Add Catalog Item' to register books."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1E293B]">Register New Catalog Item</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4 text-[#94A3B8]" />
              </button>
            </div>
            <form onSubmit={handleCreateBook} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Book Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems: Three Easy Pieces"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Author(s)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Remzi Arpaci-Dusseau"
                    value={newItem.author}
                    onChange={(e) => setNewItem({ ...newItem, author: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">ISBN Number</label>
                  <input
                    type="text"
                    required
                    value={newItem.isbn}
                    onChange={(e) => setNewItem({ ...newItem, isbn: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Discipline Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Business & Finance">Business & Finance</option>
                    <option value="Medicine & Health">Medicine & Health</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Publication Year</label>
                  <input
                    type="number"
                    required
                    value={newItem.publicationYear}
                    onChange={(e) => setNewItem({ ...newItem, publicationYear: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold"
                >
                  {saving ? "Saving..." : "Add to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
