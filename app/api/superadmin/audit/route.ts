import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: events, error } = await (supabase as any)
      .from("audit_events")
      .select("*")
      .order("event_time", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("Could not query audit_events table:", error);
      return NextResponse.json([]);
    }

    return NextResponse.json(events || []);
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch audit logs" }, { status: 500 });
  }
}

