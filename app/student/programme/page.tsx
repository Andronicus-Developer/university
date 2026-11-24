"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudentPageLoading } from "@/components/student/StudentPortalPrimitives";

export default function LegacyProgrammeRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/student/registration");
  }, [router]);
  return <StudentPageLoading label="Redirecting to Course Registration..." />;
}
