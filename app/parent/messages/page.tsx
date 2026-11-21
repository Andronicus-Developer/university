"use client";

import React, { useState } from "react";
import { MessageSquare, Send, User, Phone, Check } from "lucide-react";

export default function ParentMessagesPage() {
  const [messages, setMessages] = useState([
    {
      sender: "Mr. Kwabena Boateng (Form Master)",
      role: "Form 2 Science A Teacher",
      time: "Yesterday, 04:15 PM",
      body: "Good evening Mr. Mensah, Kofi's continuous assessment marks in Elective Physics have been exceptional this term. He will be representing the school in the National Science & Maths Quiz preliminaries.",
      isSelf: false,
    },
    {
      sender: "You (Mr. Kwame Mensah)",
      role: "Parent / Guardian",
      time: "Today, 09:20 AM",
      body: "Thank you for the update on Kofi's physics score. Will make sure he gets the recommended textbooks and continues his preparation.",
      isSelf: true,
    },
  ]);

  const [inputVal, setInputVal] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        sender: "You (Mr. Kwame Mensah)",
        role: "Parent / Guardian",
        time: "Just now",
        body: inputVal.trim(),
        isSelf: true,
      },
    ]);
    setInputVal("");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
            Direct Teacher Inquiries
          </span>
          <span className="text-xs text-slate-400">Homeroom & Workshop Masters</span>
        </div>
        <h1 className="text-xl font-black text-slate-900">Faculty Communication & Inquiries</h1>
        <p className="text-xs text-slate-500">
          Chat directly with class teachers, homeroom masters, and workshop instructors.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 max-w-3xl mx-auto space-y-4">
        <div className="space-y-3 min-h-[300px] max-h-[450px] overflow-y-auto p-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.isSelf ? "items-end" : "items-start"}`}
            >
              <span className="text-[10px] font-bold text-slate-400 mb-0.5 px-1">
                {m.sender} • {m.time}
              </span>
              <div
                className={`p-3.5 rounded-2xl text-xs max-w-[85%] ${
                  m.isSelf
                    ? "bg-blue-600 text-white rounded-br-xs shadow-xs"
                    : "bg-slate-100 text-slate-800 rounded-bl-xs"
                }`}
              >
                {m.body}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="pt-3 border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type your message to the class master..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-600"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
