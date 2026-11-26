import React from "react";
import AcademicStaffLayoutShell from "@/components/staff/AcademicStaffLayoutShell";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Teacher & Instructor Portal");

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <AcademicStaffLayoutShell portalMount="teacher">{children}</AcademicStaffLayoutShell>;
}
