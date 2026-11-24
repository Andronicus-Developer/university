"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StaffPageLoading } from "@/components/staff/StaffPortalPrimitives";

export default function LegacyLecturerSupportCasesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lecturer/advising");
  }, [router]);
  return <StaffPageLoading label="Redirecting to Student Advising..." />;
}
