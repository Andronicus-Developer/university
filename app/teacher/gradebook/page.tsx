"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StaffPageLoading } from "@/components/staff/StaffPortalPrimitives";

export default function LegacyTeacherGradebookRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/teacher/report-cards");
  }, [router]);

  return <StaffPageLoading label="Redirecting to Term Marks & Report Cards..." />;
}
