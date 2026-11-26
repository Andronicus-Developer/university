import React from "react";
import SuperAdminLayoutClient from "./SuperAdminLayoutClient";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Super Admin Console");

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminLayoutClient>{children}</SuperAdminLayoutClient>;
}
