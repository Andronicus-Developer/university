"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudentPageLoading } from "@/components/student/StudentPortalPrimitives";

export default function LegacyProgressRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/student/results");
  }, [router]);
  return <StudentPageLoading label="Redirecting to Results..." />;
}
