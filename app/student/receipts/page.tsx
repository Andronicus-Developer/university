"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StudentPageLoading } from "@/components/student/StudentPortalPrimitives";

export default function LegacyReceiptsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/student/fee-statement");
  }, [router]);
  return <StudentPageLoading label="Redirecting to Fee Statement..." />;
}
