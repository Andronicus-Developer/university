"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StaffPageLoading } from "@/components/staff/StaffPortalPrimitives";

export default function LegacyLecturerNotificationsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/lecturer/dashboard");
  }, [router]);
  return <StaffPageLoading label="Redirecting to Lecturer Dashboard..." />;
}
