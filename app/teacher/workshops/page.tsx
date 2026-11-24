"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StaffPageLoading } from "@/components/staff/StaffPortalPrimitives";

export default function LegacyTeacherWorkshopsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/teacher/modules");
  }, [router]);

  return <StaffPageLoading label="Redirecting to Trade Modules & Workshops..." />;
}
