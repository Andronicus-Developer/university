import React from "react";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Unauthorized");

export default function UnauthorizedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
