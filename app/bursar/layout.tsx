import React from "react";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Bursar Portal");

export default function BursarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
