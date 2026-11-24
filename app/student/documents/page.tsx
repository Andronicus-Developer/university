"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudentPageLoading } from "@/components/student/StudentPortalPrimitives";

export default function LegacyDocumentsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/student/profile");
  }, [router]);
  return <StudentPageLoading label="Redirecting to Profile & Settings..." />;
}
