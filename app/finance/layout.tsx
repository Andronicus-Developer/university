import React from "react";
import FinanceLayoutClient from "./FinanceLayoutClient";
import { buildPrivatePortalMetadata } from "@/lib/seo/seo-config";

export const metadata = buildPrivatePortalMetadata("Finance & Bursar Portal");

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <FinanceLayoutClient>{children}</FinanceLayoutClient>;
}
