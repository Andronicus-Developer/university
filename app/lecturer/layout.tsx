import React from "react";
import AcademicStaffLayoutShell from "@/components/staff/AcademicStaffLayoutShell";

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  return <AcademicStaffLayoutShell portalMount="lecturer">{children}</AcademicStaffLayoutShell>;
}
