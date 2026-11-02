import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractUserFromCookies } from "@/lib/supabase/fetch";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const db = supabase as any;

    const { data: offerings } = await db
      .from("course_offerings")
      .select("id, section, course:course_id(code, name)");

    const { data: sessions } = await db
      .from("class_sessions")
      .select("id, session_date, topic, course_offering_id, course_offering:course_offering_id(course:course_id(code, name))")
      .order("session_date", { ascending: false });

    return NextResponse.json({ success: true, offerings: offerings || [], sessions: sessions || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const db = supabase as any;
    const user = extractUserFromCookies(request.cookies.getAll());

    const body = await request.json();
    const { courseOfferingId, sessionDate, startTime, endTime, topic, records } = body;

    if (!courseOfferingId || !sessionDate) {
      return NextResponse.json({ success: false, error: "Course offering and date are required" }, { status: 400 });
    }

    const lecturerId = user?.id || "6d8f80fb-c341-4622-b23b-0efa4702bb66";

    // 1. Create class_session
    const { data: session, error: sErr } = await db
      .from("class_sessions")
      .insert({
        course_offering_id: courseOfferingId,
        session_date: sessionDate,
        start_time: startTime || "09:00:00",
        end_time: endTime || "11:00:00",
        topic: topic || "Course Lecture Session",
        conducted_by: lecturerId,
      })
      .select()
      .single();

    if (sErr || !session) {
      throw new Error(sErr?.message || "Failed to create class session");
    }

    // 2. Insert attendance_records
    if (records && Array.isArray(records) && records.length > 0) {
      const attRows = records.map((r: any) => ({
        class_session_id: session.id,
        student_id: r.studentId,
        status: r.status || "present",
        remarks: r.remarks || null,
        recorded_by: lecturerId,
      }));

      const { error: aErr } = await db.from("attendance_records").insert(attRows);
      if (aErr) {
        console.warn("Error inserting attendance records:", aErr.message);
      }
    }

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

