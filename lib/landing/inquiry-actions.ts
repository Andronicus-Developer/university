"use server";

import { headers } from "next/headers";
import {
  submitLandingInquiry,
  type InquirySubmissionResult,
  type LandingInquiryPayload,
} from "@/lib/landing/inquiry-service";

export async function submitLandingInquiryAction(
  payload: LandingInquiryPayload
): Promise<InquirySubmissionResult> {
  const hdrs = await headers();
  const forwarded = hdrs.get("x-forwarded-for") || "";
  const clientIp = forwarded.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "server-action";
  return submitLandingInquiry(payload, clientIp);
}
