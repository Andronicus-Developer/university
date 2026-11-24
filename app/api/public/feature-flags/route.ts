import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { listResolvedFeatureFlags } from "@/lib/superadmin/feature-flags-service";

export async function GET(request: NextRequest) {
  let schoolId =
    request.nextUrl.searchParams.get("schoolId")?.trim() || null;

  try {

    if (!schoolId) {
      try {
        const { user } = await updateSession(request);
        if (user) {
          schoolId =
            (user.app_metadata as any)?.school_id ||
            (user.app_metadata as any)?.university_id ||
            (user.user_metadata as any)?.school_id ||
            (user.user_metadata as any)?.university_id ||
            null;

          if (!schoolId) {
            const directAdmin = createDirectAdminClient();
            const { data: prof } = await (directAdmin as any)
              .from("profiles")
              .select("school_id, university_id")
              .eq("id", user.id)
              .maybeSingle();
            schoolId = prof?.school_id || prof?.university_id || null;
          }
        }
      } catch {
        // Fallback to global scope when unauthenticated
      }
    }

    const list = await listResolvedFeatureFlags(schoolId);
    const flags: Record<string, boolean> = {};
    for (const item of list) {
      flags[item.portal_key] = item.is_enabled;
    }

    return NextResponse.json(
      {
        schoolId,
        flags,
        details: list.map((f) => ({
          portal_key: f.portal_key,
          label: f.label,
          category: f.category,
          is_enabled: f.is_enabled,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/public/feature-flags error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve feature flags." },
      { status: 500 }
    );
  }
}
