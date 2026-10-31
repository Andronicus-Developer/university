import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseFetchWithRetry, extractUserFromCookies } from "@/lib/supabase/fetch";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      fetch: (input, init) => supabaseFetchWithRetry(input, init, 2, 8000),
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function getStudent(db: any, request: NextRequest) {
  const user = extractUserFromCookies(request.cookies.getAll());

  let student = null;
  if (user && user.id) {
    const { data: s } = await db
      .from("students")
      .select("*, profile:profile_id(*)")
      .or(`profile_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();
    student = s;
  }

  if (!student) {
    const { data: firstStu } = await db
      .from("students")
      .select("*, profile:profile_id(*)")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    student = firstStu;
  }

  return { user, student };
}

// GET /api/student/courses -> returns enrolled courses and available courses
export async function GET(request: NextRequest) {
  try {
    const db = getAdminClient() as any;
    const { student } = await getStudent(db, request);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const { data: enrolments } = await db
      .from("course_enrolments")
      .select(`
        id,
        course_offering_id,
        enrolment_status,
        registered_at,
        course_offering:course_offering_id(
          id,
          section,
          delivery_mode,
          capacity,
          enrolled_count,
          course:course_id(id, code, name, credits, description)
        )
      `)
      .eq("student_id", student.id);

    const enrolledOfferingIds = (enrolments || []).map((e: any) => e.course_offering_id);

    const { data: allOfferings } = await db
      .from("course_offerings")
      .select(`
        id,
        section,
        delivery_mode,
        capacity,
        enrolled_count,
        status,
        course:course_id(id, code, name, credits, description)
      `)
      .order("created_at", { ascending: true });

    const availableOfferings = (allOfferings || []).filter(
      (off: any) => !enrolledOfferingIds.includes(off.id)
    );

    return NextResponse.json({
      enrolments: enrolments || [],
      availableOfferings: availableOfferings || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/student/courses -> Enroll in a course offering
export async function POST(request: NextRequest) {
  try {
    const db = getAdminClient() as any;
    const { student } = await getStudent(db, request);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const body = await request.json();
    const { offeringId } = body;

    if (!offeringId) {
      return NextResponse.json({ error: "Missing offeringId" }, { status: 400 });
    }

    const { data: term } = await db.from("terms").select("id").limit(1).single();
    const termId = term ? term.id : null;

    // Check if already enrolled
    const { data: existing } = await db
      .from("course_enrolments")
      .select("id")
      .eq("student_id", student.id)
      .eq("course_offering_id", offeringId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Already enrolled in this course" }, { status: 400 });
    }

    const { data: newEnrolment, error: enrError } = await db
      .from("course_enrolments")
      .insert({
        student_id: student.id,
        course_offering_id: offeringId,
        term_id: termId,
        enrolment_status: "enrolled",
      })
      .select(`
        id,
        course_offering_id,
        enrolment_status,
        registered_at,
        course_offering:course_offering_id(
          id,
          section,
          delivery_mode,
          course:course_id(id, code, name, credits, description)
        )
      `)
      .single();

    if (enrError) throw enrError;

    return NextResponse.json({
      success: true,
      message: "Course enrolled successfully.",
      enrolment: newEnrolment,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/student/courses -> Drop a course enrolment immediately
export async function DELETE(request: NextRequest) {
  try {
    const db = getAdminClient() as any;
    const { student } = await getStudent(db, request);

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const searchParams = request.nextUrl.searchParams;
    const enrolmentId = body.enrolmentId || searchParams.get("enrolmentId");
    const offeringId = body.offeringId || searchParams.get("offeringId");

    if (!enrolmentId && !offeringId) {
      return NextResponse.json({ error: "Missing enrolmentId or offeringId" }, { status: 400 });
    }

    let deleteQuery = db.from("course_enrolments").delete();

    if (enrolmentId) {
      deleteQuery = deleteQuery.eq("id", enrolmentId);
    } else if (offeringId) {
      deleteQuery = deleteQuery.eq("course_offering_id", offeringId).eq("student_id", student.id);
    }

    const { data: deleted, error: delError } = await deleteQuery.select();

    if (delError) {
      console.error("Course drop error:", delError);
      throw delError;
    }

    return NextResponse.json({
      success: true,
      message: "Course dropped successfully and is immediately ready for enrollment.",
      deleted,
    });
  } catch (error: any) {
    console.error("Drop route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

