import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractUserFromCookies } from "@/lib/supabase/fetch";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const db = supabase as any;

    const { searchParams } = new URL(request.url);
    const offeringId = searchParams.get("offeringId");

    let compQuery = db
      .from("assessment_components")
      .select("id, name, component_type, weight_percentage, max_marks, course_offering_id");

    if (offeringId) {
      compQuery = compQuery.eq("course_offering_id", offeringId);
    }

    const { data: components } = await compQuery;

    return NextResponse.json({ success: true, components: components || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const db = supabase as any;
    const user = extractUserFromCookies(request.cookies.getAll());
    const lecturerId = user?.id || "6d8f80fb-c341-4622-b23b-0efa4702bb66";

    const body = await request.json();
    const { courseOfferingId, assessmentComponentId, marks, isSubmittedForModeration, submissionNotes } = body;

    // 1. Upsert marks into assessment_marks
    if (assessmentComponentId && Array.isArray(marks) && marks.length > 0) {
      for (const m of marks) {
        if (!m.enrolmentId) continue;
        await db.from("assessment_marks").upsert(
          {
            assessment_component_id: assessmentComponentId,
            enrolment_id: m.enrolmentId,
            marks_obtained: m.marksObtained !== "" && m.marksObtained !== null ? Number(m.marksObtained) : 0,
            is_absent: Boolean(m.isAbsent),
            remarks: m.remarks || null,
            entered_by: lecturerId,
            entered_at: new Date().toISOString(),
          },
          { onConflict: "assessment_component_id,enrolment_id" }
        );
      }
    }

    // 2. If submitted for moderation, upsert into result_submissions
    if (isSubmittedForModeration && courseOfferingId) {
      await db.from("result_submissions").upsert(
        {
          course_offering_id: courseOfferingId,
          submitted_by: lecturerId,
          status: "submitted",
          submission_notes: submissionNotes || "Marks entered and submitted for departmental moderation",
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "course_offering_id" }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

