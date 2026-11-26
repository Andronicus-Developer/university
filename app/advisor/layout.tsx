import React from "react";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Academic Advisor Portal");

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
