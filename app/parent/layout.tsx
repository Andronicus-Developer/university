import React from "react";
import ParentLayoutClient from "./ParentLayoutClient";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Parent & Guardian Portal");

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <ParentLayoutClient>{children}</ParentLayoutClient>;
}
