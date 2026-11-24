"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StaffPageLoading } from "@/components/staff/StaffPortalPrimitives";

export default function LegacyLecturerModerationRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lecturer/grades");
  }, [router]);
  return <StaffPageLoading label="Redirecting to Exams & Grade Entry..." />;
}
