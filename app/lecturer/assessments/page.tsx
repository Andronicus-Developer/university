"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StaffPageLoading } from "@/components/staff/StaffPortalPrimitives";

export default function LegacyLecturerAssessmentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lecturer/assignments");
  }, [router]);
  return <StaffPageLoading label="Redirecting to Assignments & CA..." />;
}
