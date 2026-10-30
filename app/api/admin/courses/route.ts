import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseFetchWithRetry } from "@/lib/supabase/fetch";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    global: {
      fetch: (input, init) => supabaseFetchWithRetry(input, init, 2, 4000),
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// GET: Fetch all courses, departments, and programmes
export async function GET() {
  try {
    const supabase = getAdminClient();

    // 1. Fetch courses with department information
    const { data: coursesData, error: coursesErr } = await supabase
      .from("courses")
      .select(`
        id,
        department_id,
        code,
        name,
        description,
        credits,
        contact_hours,
        course_type,
        is_active,
        created_at,
        updated_at,
        department:department_id(id, name, code)
      `)
      .order("code", { ascending: true });

    if (coursesErr) {
      console.error("Error fetching courses:", coursesErr);
      return NextResponse.json({ error: coursesErr.message }, { status: 500 });
    }

    // 2. Fetch departments
    const { data: departmentsData, error: deptErr } = await supabase
      .from("departments")
      .select("id, name, code")
      .order("name", { ascending: true });

    if (deptErr) {
      console.warn("Warning fetching departments:", deptErr.message);
    }

    // 3. Fetch programmes
    const { data: programmesData, error: progErr } = await supabase
      .from("programmes")
      .select("id, name, code, degree_level")
      .order("name", { ascending: true });

    if (progErr) {
      console.warn("Warning fetching programmes:", progErr.message);
    }

    // Compute stats
    const courses = (coursesData || []).map((c: any) => ({
      id: c.id,
      department_id: c.department_id,
      code: c.code,
      name: c.name,
      description: c.description || "",
      credits: Number(c.credits) || 3.0,
      contact_hours: Number(c.contact_hours) || 3,
      course_type: c.course_type || "core",
      is_active: c.is_active ?? true,
      created_at: c.created_at,
      department_name: c.department?.name || "General Department",
      department_code: c.department?.code || "GEN",
    }));

    const totalCourses = courses.length;
    const activeCourses = courses.filter((c) => c.is_active).length;
    const coreCourses = courses.filter((c) => c.course_type === "core").length;
    const electiveCourses = courses.filter((c) => c.course_type === "elective").length;

    return NextResponse.json({
      courses,
      departments: departmentsData || [],
      programmes: programmesData || [],
      stats: {
        totalCourses,
        activeCourses,
        coreCourses,
        electiveCourses,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/courses error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add a new course
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      name,
      department_id,
      credits,
      contact_hours,
      course_type,
      description,
      is_active,
    } = body;

    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json(
        { error: "Course code and course name are required." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Resolve department
    let targetDeptId = department_id;
    if (!targetDeptId) {
      const { data: defaultDept } = await supabase.from("departments").select("id").limit(1);
      targetDeptId = defaultDept?.[0]?.id;
    }

    if (!targetDeptId) {
      return NextResponse.json(
        { error: "No department found to associate course with." },
        { status: 400 }
      );
    }

    const { data: newCourse, error: insertErr } = await supabase
      .from("courses")
      .insert({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        department_id: targetDeptId,
        credits: Number(credits) || 3.0,
        contact_hours: Number(contact_hours) || 3,
        course_type: course_type || "core",
        description: description ? description.trim() : null,
        is_active: is_active ?? true,
      })
      .select(`*, department:department_id(id, name, code)`)
      .single();

    if (insertErr) {
      console.error("Insert course error:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "COURSE_CREATED",
        entity_type: "course",
        entity_id: newCourse.id,
        outcome: "success",
        metadata: { code: newCourse.code, name: newCourse.name },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, course: newCourse });
  } catch (err: any) {
    console.error("POST /api/admin/courses error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing course
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      code,
      name,
      department_id,
      credits,
      contact_hours,
      course_type,
      description,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Course ID is required for update." }, { status: 400 });
    }

    const supabase = getAdminClient();

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (code !== undefined) updatePayload.code = code.trim().toUpperCase();
    if (name !== undefined) updatePayload.name = name.trim();
    if (department_id !== undefined) updatePayload.department_id = department_id;
    if (credits !== undefined) updatePayload.credits = Number(credits);
    if (contact_hours !== undefined) updatePayload.contact_hours = Number(contact_hours);
    if (course_type !== undefined) updatePayload.course_type = course_type;
    if (description !== undefined) updatePayload.description = description.trim();
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

    const { data: updatedCourse, error: updateErr } = await supabase
      .from("courses")
      .update(updatePayload)
      .eq("id", id)
      .select(`*, department:department_id(id, name, code)`)
      .single();

    if (updateErr) {
      console.error("Update course error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "COURSE_UPDATED",
        entity_type: "course",
        entity_id: id,
        outcome: "success",
        metadata: { code: updatePayload.code, name: updatePayload.name },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, course: updatedCourse });
  } catch (err: any) {
    console.error("PUT /api/admin/courses error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a course and clean up dependent academic references
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Course ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Delete associated curriculum requirements (ON DELETE RESTRICT)
    const { error: currErr } = await supabase
      .from("curriculum_requirements")
      .delete()
      .eq("course_id", id);

    if (currErr) {
      console.warn("Warning deleting linked curriculum_requirements:", currErr.message);
    }

    // 2. Delete associated prerequisites referencing this course
    const { error: prereqErr } = await supabase
      .from("prerequisites")
      .delete()
      .or(`course_id.eq.${id},prerequisite_course_id.eq.${id}`);

    if (prereqErr) {
      console.warn("Warning deleting linked prerequisites:", prereqErr.message);
    }

    // 3. Delete associated course offerings and their restricted enrolments
    const { data: offerings } = await supabase
      .from("course_offerings")
      .select("id")
      .eq("course_id", id);

    if (offerings && offerings.length > 0) {
      const offeringIds = offerings.map((o: { id: string }) => o.id);

      // course_enrolments has ON DELETE RESTRICT on course_offering_id;
      // its children (enrolment_overrides, assessment_marks, published_results) cascade automatically
      const { error: enrolErr } = await supabase
        .from("course_enrolments")
        .delete()
        .in("course_offering_id", offeringIds);

      if (enrolErr) {
        console.warn("Warning deleting linked course_enrolments:", enrolErr.message);
      }

      // Other course_offerings children (teaching_assignments, timetable_events, class_sessions,
      // assessment_components, result_submissions) have ON DELETE CASCADE
      const { error: offErr } = await supabase
        .from("course_offerings")
        .delete()
        .in("id", offeringIds);

      if (offErr) {
        console.warn("Warning deleting linked course_offerings:", offErr.message);
      }
    }

    // 4. Delete the course itself
    const { error: deleteErr } = await supabase
      .from("courses")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      console.error("Delete course error:", deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "COURSE_DELETED",
        entity_type: "course",
        entity_id: id,
        outcome: "success",
        metadata: { course_id: id },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, message: "Course successfully removed from catalog." });
  } catch (err: any) {
    console.error("DELETE /api/admin/courses error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

