"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StaffPageLoading } from "@/components/staff/StaffPortalPrimitives";

export default function LegacyLecturerClassesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lecturer/attendance");
  }, [router]);
  return <StaffPageLoading label="Redirecting to Class Lists & Attendance..." />;
}
