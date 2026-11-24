"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudentPageLoading } from "@/components/student/StudentPortalPrimitives";

export default function LegacyAssessmentsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/student/results");
  }, [router]);
  return <StudentPageLoading label="Redirecting to Results..." />;
}
