"use client";

import React, { useState } from "react";
import { MessageSquare, Send, Search, CheckCircle2, User, Phone } from "lucide-react";

export default function TeacherMessagesPage() {
  const [selectedThread, setSelectedThread] = useState(0);
  const [replyText, setReplyText] = useState("");

  const threads = [
    {
      id: "t1",
      parentName: "Mr. Kwame Mensah",
      studentName: "Kofi Mensah (Form 2 Science A)",
      phone: "+233 24 411 9821",
      lastMessage: "Thank you for the update on Kofi's physics score. Will make sure he gets the recommended textbooks.",
      date: "Today, 09:20 AM",
      unread: false,
    },
    {
      id: "t2",
      parentName: "Mrs. Grace Boateng",
      studentName: "Ama Serwaa Boateng (Form 2 Science A)",
      phone: "+233 20 892 3410",
      lastMessage: "Good morning Mr. Boateng, Ama reported slight flu today. Please excuse her from cross-country practice.",
      date: "Yesterday",
      unread: true,
    },
    {
      id: "t3",
      parentName: "Madam Faustina Appiah",
      studentName: "Ebenezer Appiah (NVTI Welding Apprentice)",
      phone: "+233 24 670 1234",
      lastMessage: "Hello Master, has the industrial safety boots arrived at the workshop store yet?",
      date: "2 days ago",
      unread: false,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
            Parent Communication Portal
          </span>
          <span className="text-xs text-slate-400">Direct Inquiries & Disciplinary Remarks</span>
        </div>
        <h1 className="text-xl font-black text-slate-900">Parent & Guardian Messages</h1>
        <p className="text-xs text-slate-500">
          Communicate directly with parents regarding attendance, continuous assessment, and practical trade readiness.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden min-h-[500px]">
        {/* Left 4 Cols: Thread List */}
        <div className="md:col-span-5 border-r border-slate-200/80 p-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Active Inquiries ({threads.length})
          </div>
          {threads.map((t, idx) => (
            <div
              key={t.id}
              onClick={() => setSelectedThread(idx)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedThread === idx
                  ? "bg-indigo-50/70 border-indigo-200 shadow-2xs"
                  : "bg-white border-slate-100 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-slate-900">{t.parentName}</span>
                <span className="text-[10px] text-slate-400">{t.date}</span>
              </div>
              <div className="text-[11px] font-semibold text-indigo-700 truncate">
                {t.studentName}
              </div>
              <p className="text-xs text-slate-500 line-clamp-1 mt-1">{t.lastMessage}</p>
            </div>
          ))}
        </div>

        {/* Right 7 Cols: Active Thread */}
        <div className="md:col-span-7 p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {threads[selectedThread].parentName}
                </h3>
                <p className="text-xs text-indigo-600 font-semibold">
                  Ward: {threads[selectedThread].studentName} • {threads[selectedThread].phone}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-100 text-xs text-slate-800 max-w-[85%]">
                {threads[selectedThread].lastMessage}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your message to the parent..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-600"
            />
            <button
              type="button"
              onClick={() => setReplyText("")}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
