"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sliders,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from "lucide-react";

interface ComponentConfig {
  id: string;
  name: string;
  type: string;
  weight: number;
  maxMarks: number;
}

export default function LecturerAssessmentSetupPage() {
  const [selectedCourse, setSelectedCourse] = useState("CS101");
  const [components, setComponents] = useState<ComponentConfig[]>([
    { id: "1", name: "Continuous Assessment Quizzes", type: "quiz", weight: 15, maxMarks: 30 },
    { id: "2", name: "Practical Lab Projects", type: "project", weight: 20, maxMarks: 50 },
    { id: "3", name: "Mid-Semester Examination", type: "exam", weight: 25, maxMarks: 100 },
    { id: "4", name: "End of Semester Examination", type: "exam", weight: 40, maxMarks: 100 },
  ]);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const totalWeight = components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  const addComponent = () => {
    setComponents((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: "New Assessment Component",
        type: "assignment",
        weight: 10,
        maxMarks: 100,
      },
    ]);
  };

  const removeComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const updateComponent = (id: string, field: keyof ComponentConfig, value: any) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeight !== 100) {
      alert(`The total weight must be exactly 100%. Currently it is ${totalWeight}%.`);
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setNotification(`Assessment components for ${selectedCourse} successfully saved.`);
  };

  return (
    <div className="space-y-6 max-w-[1580px] mx-auto pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/lecturer/dashboard" className="text-emerald-600 hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Assessment Setup</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Course Assessment & Grading Structure
          </h1>
          <p className="text-xs text-slate-500">
            Define continuous assessment components, examination percentage weights, and grading schemes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={addComponent}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Component</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Saving..." : "Save Assessment Scheme"}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        </div>
      )}

      {/* Course Selector */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800">Selected Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-700 focus:outline-none cursor-pointer mt-0.5"
            >
              <option value="CS101">CS101 - Programming Foundations (Sec A)</option>
              <option value="CS204">CS204 - Database Systems (Sec B)</option>
              <option value="CS308">CS308 - Software Engineering (Sec A)</option>
            </select>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-500 font-medium">Total Assessment Weight</div>
          <div
            className={`text-lg font-extrabold ${
              totalWeight === 100 ? "text-emerald-600" : "text-amber-600"
            }`}
          >
            {totalWeight}% / 100%
          </div>
        </div>
      </div>

      {/* Components List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Graded Components Configuration</h2>

        <div className="space-y-3">
          {components.map((comp, idx) => (
            <div
              key={comp.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1">
                <span className="h-6 w-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={comp.name}
                  onChange={(e) => updateComponent(comp.id, "name", e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                />
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Type</span>
                  <select
                    value={comp.type}
                    onChange={(e) => updateComponent(comp.id, "type", e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="quiz">Quiz / CA</option>
                    <option value="assignment">Assignment</option>
                    <option value="project">Project / Lab</option>
                    <option value="exam">Examination</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Weight (%)</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={comp.weight}
                    onChange={(e) => updateComponent(comp.id, "weight", Number(e.target.value))}
                    className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                  />
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">Max Marks</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={comp.maxMarks}
                    onChange={(e) => updateComponent(comp.id, "maxMarks", Number(e.target.value))}
                    className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-center"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeComponent(comp.id)}
                  className="mt-3 p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                  title="Remove Component"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

