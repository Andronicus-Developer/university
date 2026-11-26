import React from "react";
import AcademicStaffLayoutShell from "@/components/staff/AcademicStaffLayoutShell";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Lecturer Portal");

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  return <AcademicStaffLayoutShell portalMount="lecturer">{children}</AcademicStaffLayoutShell>;
}
