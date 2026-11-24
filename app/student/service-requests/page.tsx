"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudentPageLoading } from "@/components/student/StudentPortalPrimitives";

export default function LegacyServiceRequestsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/student/dashboard");
  }, [router]);
  return <StudentPageLoading label="Redirecting to Dashboard..." />;
}
