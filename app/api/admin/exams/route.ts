import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseFetchWithRetry } from "@/lib/supabase/fetch";

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

// GET: Fetch all examination & assessment components, courses, grading scales, and stats
export async function GET() {
  try {
    const supabase = getAdminClient();

    // 1. Fetch assessment components
    const { data: assessments, error: assessErr } = await supabase
      .from("assessment_components")
      .select(`
        id,
        course_offering_id,
        name,
        component_type,
        weight_percentage,
        max_marks,
        created_at,
        course_offering:course_offering_id(
          id,
          section,
          delivery_mode,
          status,
          course:course_id(id, code, name)
        )
      `)
      .order("created_at", { ascending: false });

    if (assessErr) {
      console.error("Error fetching assessment components:", assessErr);
      return NextResponse.json({ error: assessErr.message }, { status: 500 });
    }

    // 2. Fetch all courses for exam assignment dropdown
    const { data: coursesData } = await supabase
      .from("courses")
      .select("id, code, name")
      .order("code", { ascending: true });

    // 3. Fetch grade scales
    const { data: gradeScales } = await supabase
      .from("grade_scales")
      .select("id, name, description, is_default");

    const scaleId = gradeScales?.[0]?.id;
    let gradeScaleItems: any[] = [];
    if (scaleId) {
      const { data: items } = await supabase
        .from("grade_scale_items")
        .select("id, letter_grade, min_percentage, max_percentage, grade_points, pass_status, remarks")
        .eq("grade_scale_id", scaleId)
        .order("min_percentage", { ascending: false });
      gradeScaleItems = items || [];
    }

    // Map assessments
    const formattedExams = (assessments || []).map((a: any) => {
      const course = a.course_offering?.course;
      return {
        id: a.id,
        course_offering_id: a.course_offering_id,
        course_id: course?.id || null,
        course_code: course?.code || "GEN100",
        course_name: course?.name || "General Course",
        section: a.course_offering?.section || "A",
        name: a.name,
        component_type: a.component_type,
        weight_percentage: Number(a.weight_percentage),
        max_marks: Number(a.max_marks),
        status: a.course_offering?.status || "published",
        created_at: a.created_at,
      };
    });

    const totalExams = formattedExams.length;
    const finalExams = formattedExams.filter((e) => e.component_type === "final_exam").length;
    const midterms = formattedExams.filter((e) => e.component_type === "midterm").length;
    const continuousAssessments = formattedExams.filter(
      (e) => !["final_exam", "midterm"].includes(e.component_type)
    ).length;

    return NextResponse.json({
      exams: formattedExams,
      courses: coursesData || [],
      gradeScales: gradeScales || [],
      gradeScaleItems,
      stats: {
        totalExams,
        finalExams,
        midterms,
        continuousAssessments,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/exams error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add an examination / assessment component
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      course_id,
      name,
      component_type,
      weight_percentage,
      max_marks,
      section,
    } = body;

    if (!course_id || !name?.trim()) {
      return NextResponse.json(
        { error: "Course and examination title are required." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 1. Resolve active term
    const { data: terms } = await supabase.from("terms").select("id").limit(1);
    const termId = terms?.[0]?.id;

    if (!termId) {
      return NextResponse.json({ error: "No academic term configured." }, { status: 400 });
    }

    // 2. Find or create a course offering for this course and term
    const sec = section?.trim() || "A";
    let offeringId: string | null = null;

    const { data: existingOffering } = await supabase
      .from("course_offerings")
      .select("id")
      .eq("course_id", course_id)
      .eq("term_id", termId)
      .eq("section", sec)
      .maybeSingle();

    if (existingOffering) {
      offeringId = existingOffering.id;
    } else {
      const { data: newOffering, error: offErr } = await supabase
        .from("course_offerings")
        .insert({
          course_id,
          term_id: termId,
          section: sec,
          delivery_mode: "in_person",
          capacity: 80,
          status: "published",
        })
        .select("id")
        .single();

      if (offErr) {
        console.error("Course offering creation error:", offErr);
        return NextResponse.json({ error: offErr.message }, { status: 500 });
      }
      offeringId = newOffering.id;
    }

    // 3. Insert assessment component
    const { data: newComponent, error: compErr } = await supabase
      .from("assessment_components")
      .insert({
        course_offering_id: offeringId,
        name: name.trim(),
        component_type: component_type || "final_exam",
        weight_percentage: Number(weight_percentage) || 60,
        max_marks: Number(max_marks) || 100,
      })
      .select()
      .single();

    if (compErr) {
      console.error("Assessment component insert error:", compErr);
      return NextResponse.json({ error: compErr.message }, { status: 500 });
    }

    // 4. Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "EXAM_COMPONENT_CREATED",
        entity_type: "assessment_component",
        entity_id: newComponent.id,
        outcome: "success",
        metadata: { name: newComponent.name, type: newComponent.component_type },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, exam: newComponent });
  } catch (err: any) {
    console.error("POST /api/admin/exams error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an examination / assessment component
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, component_type, weight_percentage, max_marks } = body;

    if (!id) {
      return NextResponse.json({ error: "Exam component ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name.trim();
    if (component_type !== undefined) updatePayload.component_type = component_type;
    if (weight_percentage !== undefined) updatePayload.weight_percentage = Number(weight_percentage);
    if (max_marks !== undefined) updatePayload.max_marks = Number(max_marks);

    const { data: updatedComponent, error: updateErr } = await supabase
      .from("assessment_components")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("Update assessment error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "EXAM_COMPONENT_UPDATED",
        entity_type: "assessment_component",
        entity_id: id,
        outcome: "success",
        metadata: updatePayload,
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, exam: updatedComponent });
  } catch (err: any) {
    console.error("PUT /api/admin/exams error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete an examination / assessment component
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Exam ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Delete linked marks
    await supabase.from("assessment_marks").delete().eq("assessment_component_id", id);

    // 2. Delete component
    const { error: delErr } = await supabase
      .from("assessment_components")
      .delete()
      .eq("id", id);

    if (delErr) {
      console.error("Delete exam error:", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // 3. Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "EXAM_COMPONENT_DELETED",
        entity_type: "assessment_component",
        entity_id: id,
        outcome: "success",
        metadata: { exam_id: id },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, message: "Exam component removed." });
  } catch (err: any) {
    console.error("DELETE /api/admin/exams error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

