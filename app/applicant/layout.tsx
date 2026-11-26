import React from "react";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Applicant Portal");

export default function ApplicantLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
