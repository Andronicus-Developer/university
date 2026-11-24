"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClassicLoading } from "@/components/portals/ClassicPortalPrimitives";

export function FinanceRedirectPage({
  to,
  label = "Redirecting...",
}: {
  to: string;
  label?: string;
}) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return <ClassicLoading label={label} />;
}
