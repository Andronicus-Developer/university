import React from "react";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Portal Unavailable");

export default function PortalUnavailableLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
