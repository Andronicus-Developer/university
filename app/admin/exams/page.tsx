"use client";

import React, { useEffect, useState } from "react";
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Award,
  RefreshCw,
  Lock,
  Edit2,
  Trash2,
  X,
  BookOpen,
  Calendar,
  Layers,
  Percent,
} from "lucide-react";

interface ExamItem {
  id: string;
  course_offering_id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  section: string;
  name: string;
  component_type: string;
  weight_percentage: number;
  max_marks: number;
  status: string;
  created_at: string;
}

interface CourseOption {
  id: string;
  code: string;
  name: string;
}

interface GradeScaleItem {
  id: string;
  letter_grade: string;
  min_percentage: number;
  max_percentage: number;
  grade_points: number;
  pass_status: boolean;
  remarks: string;
}

interface ExamStats {
  totalExams: number;
  finalExams: number;
  midterms: number;
  continuousAssessments: number;
}

export default function ExaminationsPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [gradeScaleItems, setGradeScaleItems] = useState<GradeScaleItem[]>([]);
  const [stats, setStats] = useState<ExamStats>({
    totalExams: 0,
    finalExams: 0,
    midterms: 0,
    continuousAssessments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"exams" | "grading_scale">("exams");

  // Notifications
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Selected item
  const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    courseId: "",
    name: "",
    componentType: "final_exam",
    weightPercentage: 60,
    maxMarks: 100,
    section: "A",
  });

  const showNotification = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/exams");
      const data = await res.json();

      if (!res.ok) {
        showNotification("error", data.error || "Failed to load examination components");
        return;
      }

      setExams(data.exams || []);
      setCourses(data.courses || []);
      setGradeScaleItems(data.gradeScaleItems || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      showNotification("error", err.message || "Failed to fetch examination records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const openAddModal = () => {
    setFormData({
      courseId: courses[0]?.id || "",
      name: "End of Semester Examination",
      componentType: "final_exam",
      weightPercentage: 60,
      maxMarks: 100,
      section: "A",
    });
    setShowAddModal(true);
  };

  const openEditModal = (exam: ExamItem) => {
    setSelectedExam(exam);
    setFormData({
      courseId: exam.course_id,
      name: exam.name,
      componentType: exam.component_type,
      weightPercentage: exam.weight_percentage,
      maxMarks: exam.max_marks,
      section: exam.section,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (exam: ExamItem) => {
    setSelectedExam(exam);
    setShowDeleteModal(true);
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.courseId || !formData.name.trim()) {
      showNotification("error", "Course and examination title are required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: formData.courseId,
          name: formData.name,
          component_type: formData.componentType,
          weight_percentage: formData.weightPercentage,
          max_marks: formData.maxMarks,
          section: formData.section,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Failed to create examination component");
        return;
      }

      showNotification("success", `Exam "${formData.name}" scheduled in database!`);
      setShowAddModal(false);
      fetchExams();
    } catch (err: any) {
      showNotification("error", err.message || "Could not schedule exam");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/exams", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedExam.id,
          name: formData.name,
          component_type: formData.componentType,
          weight_percentage: formData.weightPercentage,
          max_marks: formData.maxMarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Failed to update exam");
        return;
      }

      showNotification("success", `Exam "${formData.name}" updated successfully.`);
      setShowEditModal(false);
      fetchExams();
    } catch (err: any) {
      showNotification("error", err.message || "Could not update exam");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!selectedExam) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/exams?id=${encodeURIComponent(selectedExam.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification("error", data.error || "Failed to delete exam");
        return;
      }

      showNotification("success", `Exam "${selectedExam.name}" removed from database.`);
      setShowDeleteModal(false);
      setSelectedExam(null);
      fetchExams();
    } catch (err: any) {
      showNotification("error", err.message || "Could not delete exam");
    } finally {
      setDeleting(false);
    }
  };

  const filteredExams = exams.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.course_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (typeFilter !== "all" && e.component_type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold transition-all ${
            toast.type === "success"
              ? "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]"
              : "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] font-medium">
            <span className="text-[#3B82F6] hover:underline cursor-pointer">Dashboard</span>
            <span>/</span>
            <span className="text-[#1E293B] font-semibold">Exams & Assessment</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B] mt-1">
            Examinations & Academic Grading
          </h1>
          <p className="text-xs text-[#64748B]">
            Configure examination papers, assessment weightings, tertiary grading standards, and published results in the database.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule Examination</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Total Assessments
            </p>
            <h3 className="text-2xl font-bold text-[#1E293B] mt-1">{stats.totalExams}</h3>
            <span className="text-[11px] text-blue-600 font-medium">Configured papers</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <FileCheck2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Final Examinations
            </p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.finalExams}</h3>
            <span className="text-[11px] text-[#64748B] font-medium">Terminal exams</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Mid-Semester Tests
            </p>
            <h3 className="text-2xl font-bold text-[#1E293B] mt-1">{stats.midterms}</h3>
            <span className="text-[11px] text-[#64748B] font-medium">Midterm assessments</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
              Continuous & Quizzes
            </p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.continuousAssessments}</h3>
            <span className="text-[11px] text-[#64748B] font-medium">Class components</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] gap-4">
        <button
          onClick={() => setActiveTab("exams")}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === "exams"
              ? "text-[#2563EB] border-b-2 border-[#2563EB]"
              : "text-[#64748B] hover:text-[#1E293B]"
          }`}
        >
          Scheduled Examinations & Assessments
        </button>
        <button
          onClick={() => setActiveTab("grading_scale")}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeTab === "grading_scale"
              ? "text-[#2563EB] border-b-2 border-[#2563EB]"
              : "text-[#64748B] hover:text-[#1E293B]"
          }`}
        >
          Ghana Standard 4.0 Grading Scheme
        </button>
      </div>

      {activeTab === "exams" && (
        <>
          {/* Search & Filter */}
          <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by course code, title, or assessment name..."
                className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    typeFilter === "all" ? "bg-white text-[#1E293B] shadow-2xs" : "hover:text-[#1E293B]"
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setTypeFilter("final_exam")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    typeFilter === "final_exam" ? "bg-white text-emerald-600 shadow-2xs" : "hover:text-emerald-600"
                  }`}
                >
                  Final Exams
                </button>
                <button
                  onClick={() => setTypeFilter("midterm")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    typeFilter === "midterm" ? "bg-white text-purple-600 shadow-2xs" : "hover:text-purple-600"
                  }`}
                >
                  Midterm
                </button>
                <button
                  onClick={() => setTypeFilter("assignment")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    typeFilter === "assignment" ? "bg-white text-blue-600 shadow-2xs" : "hover:text-blue-600"
                  }`}
                >
                  Assignment
                </button>
              </div>

              <button
                onClick={fetchExams}
                title="Refresh examinations"
                className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#64748B] transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Exams Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Examination Title</th>
                    <th className="py-3 px-4">Assessment Category</th>
                    <th className="py-3 px-4">Weight</th>
                    <th className="py-3 px-4">Max Marks</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] text-xs">
                  {filteredExams.length > 0 ? (
                    filteredExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-[#2563EB]">
                            {exam.course_code}
                          </div>
                          <div className="text-[11px] text-[#64748B] font-normal truncate max-w-[200px]">
                            {exam.course_name} (Sec {exam.section})
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-[#1E293B]">
                          {exam.name}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              exam.component_type === "final_exam"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : exam.component_type === "midterm"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {exam.component_type.replace("_", " ")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-[#1E293B]">
                          {exam.weight_percentage}%
                        </td>

                        <td className="py-3.5 px-4 text-[#64748B]">
                          {exam.max_marks} pts
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                            <CheckCircle className="h-3 w-3" />
                            Approved
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(exam)}
                              title="Edit Exam"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(exam)}
                              title="Delete Exam"
                              className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-[#94A3B8]">
                        {loading
                          ? "Querying exam configurations from Supabase..."
                          : "No exams scheduled. Click 'Schedule Examination' to add one to the database."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Grading Scale Scheme Tab */}
      {activeTab === "grading_scale" && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#1E293B]">
              National Standard Tertiary Grading System (4.0 Scale)
            </h3>
            <p className="text-xs text-[#64748B]">
              Institutional grade boundaries used for course grade point and cumulative GPA calculations.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Letter Grade</th>
                  <th className="py-2.5 px-4">Score Range (%)</th>
                  <th className="py-2.5 px-4">Grade Point (GPA)</th>
                  <th className="py-2.5 px-4">Standing / Classification</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {gradeScaleItems.length > 0 ? (
                  gradeScaleItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-4 font-bold text-[#1E293B]">
                        {item.letter_grade}
                      </td>
                      <td className="py-2.5 px-4 text-[#475569]">
                        {item.min_percentage}% – {item.max_percentage}%
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[#2563EB]">
                        {Number(item.grade_points).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-[#64748B]">
                        {item.remarks || "Standard Standing"}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.pass_status
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {item.pass_status ? "Pass" : "Fail"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  [
                    { grade: "A", range: "80 – 100", gp: "4.00", class: "Excellent / First Class", pass: true },
                    { grade: "B+", range: "75 – 79", gp: "3.50", class: "Very Good / Second Upper", pass: true },
                    { grade: "B", range: "70 – 74", gp: "3.00", class: "Good / Second Upper", pass: true },
                    { grade: "C+", range: "65 – 69", gp: "2.50", class: "Fairly Good / Second Lower", pass: true },
                    { grade: "C", range: "60 – 64", gp: "2.00", class: "Satisfactory / Second Lower", pass: true },
                    { grade: "D+", range: "55 – 59", gp: "1.50", class: "Pass / Third Class", pass: true },
                    { grade: "D", range: "50 – 54", gp: "1.00", class: "Bare Pass / Pass Degree", pass: true },
                    { grade: "F", range: "0 – 49", gp: "0.00", class: "Fail", pass: false },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-4 font-bold text-[#1E293B]">{row.grade}</td>
                      <td className="py-2.5 px-4 text-[#475569]">{row.range}%</td>
                      <td className="py-2.5 px-4 font-bold text-[#2563EB]">{row.gp}</td>
                      <td className="py-2.5 px-4 text-[#64748B]">{row.class}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.pass ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {row.pass ? "Pass" : "Fail"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Exam Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#1E293B]">Schedule Examination / Assessment</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Target Course</label>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} – {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Examination Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Semester Final Examination"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Type</label>
                  <select
                    value={formData.componentType}
                    onChange={(e) => setFormData({ ...formData, componentType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="final_exam">Final Exam</option>
                    <option value="midterm">Mid-Semester Exam</option>
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                    <option value="project">Project / Term Paper</option>
                    <option value="practical">Laboratory Practical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Weight (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={formData.weightPercentage}
                    onChange={(e) => setFormData({ ...formData, weightPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Max Marks</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.maxMarks}
                    onChange={(e) => setFormData({ ...formData, maxMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Scheduling..." : "Save Examination"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Exam Modal */}
      {showEditModal && selectedExam && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-[#2563EB]" />
                <h3 className="text-sm font-bold text-[#1E293B]">
                  Edit Assessment: {selectedExam.course_code}
                </h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateExam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Examination Title</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Type</label>
                  <select
                    value={formData.componentType}
                    onChange={(e) => setFormData({ ...formData, componentType: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  >
                    <option value="final_exam">Final Exam</option>
                    <option value="midterm">Mid-Semester Exam</option>
                    <option value="quiz">Quiz</option>
                    <option value="assignment">Assignment</option>
                    <option value="project">Project / Term Paper</option>
                    <option value="practical">Laboratory Practical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Weight (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={formData.weightPercentage}
                    onChange={(e) => setFormData({ ...formData, weightPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Max Marks</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.maxMarks}
                    onChange={(e) => setFormData({ ...formData, maxMarks: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Exam Modal */}
      {showDeleteModal && selectedExam && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1E293B]">Delete Examination Paper?</h3>
                <p className="text-xs text-[#64748B]">This removes the assessment component from the course offering.</p>
              </div>
            </div>

            <div className="bg-[#FEF2F2] p-3 rounded-xl border border-[#FECACA] text-xs text-[#991B1B]">
              <p>
                Are you sure you want to remove <span className="font-bold">{selectedExam.name}</span> for course{" "}
                <span className="font-bold">{selectedExam.course_code}</span>?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedExam(null);
                }}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1E293B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExam}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleting ? "Deleting..." : "Delete Exam"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
