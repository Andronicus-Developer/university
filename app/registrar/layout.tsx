import React from "react";
import RegistrarLayoutClient from "./RegistrarLayoutClient";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Academic Registrar Portal");

export default function RegistrarLayout({ children }: { children: React.ReactNode }) {
  return <RegistrarLayoutClient>{children}</RegistrarLayoutClient>;
}
