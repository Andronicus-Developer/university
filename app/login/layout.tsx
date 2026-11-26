import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Erudian360 university, high school, or vocational institution portal for administrators, faculty, students, parents, and bursars.",
  alternates: {
    canonical: "/login",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
