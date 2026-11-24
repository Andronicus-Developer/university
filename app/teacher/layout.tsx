import React from "react";
import AcademicStaffLayoutShell from "@/components/staff/AcademicStaffLayoutShell";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <AcademicStaffLayoutShell portalMount="teacher">{children}</AcademicStaffLayoutShell>;
}
