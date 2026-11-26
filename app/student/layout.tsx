import React from "react";
import StudentLayoutClient from "./StudentLayoutClient";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Student Portal");

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <StudentLayoutClient>{children}</StudentLayoutClient>;
}
