import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseFetchWithRetry } from "@/lib/supabase/fetch";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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

// GET: Fetch all academic programs, departments, and stats
export async function GET() {
  try {
    const supabase = getAdminClient();

    // 1. Fetch programs with department information
    const { data: progsData, error: progsErr } = await supabase
      .from("programmes")
      .select(`
        id,
        department_id,
        code,
        name,
        degree_level,
        duration_years,
        total_credits_required,
        total_credits,
        is_active,
        created_at,
        updated_at,
        department:department_id(id, name, code)
      `)
      .order("code", { ascending: true });

    if (progsErr) {
      console.error("Error fetching programmes:", progsErr);
      return NextResponse.json({ error: progsErr.message }, { status: 500 });
    }

    // 2. Fetch departments
    const { data: departmentsData, error: deptErr } = await supabase
      .from("departments")
      .select("id, name, code")
      .order("name", { ascending: true });

    if (deptErr) {
      console.warn("Warning fetching departments:", deptErr.message);
    }

    // Format programs
    const programs = (progsData || []).map((p: any) => ({
      id: p.id,
      department_id: p.department_id,
      code: p.code,
      name: p.name,
      degree_level: p.degree_level || "undergraduate",
      duration_years: Number(p.duration_years) || 4,
      total_credits: Number(p.total_credits_required || p.total_credits) || 120,
      is_active: p.is_active ?? true,
      created_at: p.created_at,
      updated_at: p.updated_at,
      department_name: p.department?.name || "General Department",
      department_code: p.department?.code || "GEN",
    }));

    const totalPrograms = programs.length;
    const activePrograms = programs.filter((p) => p.is_active).length;
    const undergraduateCount = programs.filter((p) =>
      ["undergraduate", "bachelor"].includes(String(p.degree_level).toLowerCase())
    ).length;
    const postgraduateCount = programs.filter((p) =>
      ["postgraduate", "master", "doctorate"].includes(String(p.degree_level).toLowerCase())
    ).length;
    const diplomaCount = programs.filter((p) =>
      ["diploma", "certificate"].includes(String(p.degree_level).toLowerCase())
    ).length;

    return NextResponse.json({
      programs,
      departments: departmentsData || [],
      stats: {
        totalPrograms,
        activePrograms,
        undergraduateCount,
        postgraduateCount,
        diplomaCount,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/programs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new academic program in Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      name,
      department_id,
      degree_level,
      duration_years,
      total_credits,
      is_active,
    } = body;

    if (!code?.trim() || !name?.trim()) {
      return NextResponse.json(
        { error: "Program code and program name are required." },
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
        { error: "No department found to associate program with." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    const creditsNum = Number(total_credits) || 120;
    const durationNum = Number(duration_years) || 4;

    const payload: any = {
      code: cleanCode,
      name: name.trim(),
      department_id: targetDeptId,
      degree_level: degree_level || "undergraduate",
      duration_years: durationNum,
      total_credits_required: creditsNum,
      total_credits: creditsNum,
      is_active: is_active ?? true,
    };

    const { data: newProgram, error: insertErr } = await supabase
      .from("programmes")
      .insert(payload)
      .select(`*, department:department_id(id, name, code)`)
      .single();

    if (insertErr) {
      console.error("Insert program error:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "PROGRAM_CREATED",
        entity_type: "programme",
        entity_id: newProgram.id,
        outcome: "success",
        metadata: { code: newProgram.code, name: newProgram.name },
      });
    } catch {
      // Non-blocking
    }

    const formattedProgram = {
      id: newProgram.id,
      department_id: newProgram.department_id,
      code: newProgram.code,
      name: newProgram.name,
      degree_level: newProgram.degree_level || "undergraduate",
      duration_years: Number(newProgram.duration_years) || 4,
      total_credits: Number(newProgram.total_credits_required || newProgram.total_credits) || 120,
      is_active: newProgram.is_active ?? true,
      created_at: newProgram.created_at,
      updated_at: newProgram.updated_at,
      department_name: newProgram.department?.name || "General Department",
      department_code: newProgram.department?.code || "GEN",
    };

    return NextResponse.json({ success: true, program: formattedProgram });
  } catch (err: any) {
    console.error("POST /api/admin/programs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing academic program in Supabase
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      code,
      name,
      department_id,
      degree_level,
      duration_years,
      total_credits,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Program ID is required for update." }, { status: 400 });
    }

    const supabase = getAdminClient();

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (code !== undefined) updatePayload.code = code.trim().toUpperCase();
    if (name !== undefined) updatePayload.name = name.trim();
    if (department_id !== undefined) updatePayload.department_id = department_id;
    if (degree_level !== undefined) updatePayload.degree_level = degree_level;
    if (duration_years !== undefined) updatePayload.duration_years = Number(duration_years);
    if (total_credits !== undefined) {
      const creditsNum = Number(total_credits);
      updatePayload.total_credits_required = creditsNum;
      updatePayload.total_credits = creditsNum;
    }
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

    const { data: updatedProgram, error: updateErr } = await supabase
      .from("programmes")
      .update(updatePayload)
      .eq("id", id)
      .select(`*, department:department_id(id, name, code)`)
      .single();

    if (updateErr) {
      console.error("Update program error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "PROGRAM_UPDATED",
        entity_type: "programme",
        entity_id: id,
        outcome: "success",
        metadata: { code: updatedProgram.code, name: updatedProgram.name },
      });
    } catch {
      // Non-blocking
    }

    const formattedProgram = {
      id: updatedProgram.id,
      department_id: updatedProgram.department_id,
      code: updatedProgram.code,
      name: updatedProgram.name,
      degree_level: updatedProgram.degree_level || "undergraduate",
      duration_years: Number(updatedProgram.duration_years) || 4,
      total_credits: Number(updatedProgram.total_credits_required || updatedProgram.total_credits) || 120,
      is_active: updatedProgram.is_active ?? true,
      created_at: updatedProgram.created_at,
      updated_at: updatedProgram.updated_at,
      department_name: updatedProgram.department?.name || "General Department",
      department_code: updatedProgram.department?.code || "GEN",
    };

    return NextResponse.json({ success: true, program: formattedProgram });
  } catch (err: any) {
    console.error("PUT /api/admin/programs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete an academic program from Supabase database
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Program ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Clean up linked programme_versions if any
    try {
      await supabase.from("programme_versions").delete().eq("programme_id", id);
    } catch (err) {
      console.warn("Warning deleting linked programme_versions:", err);
    }

    // 2. Clean up linked application_programmes if any
    try {
      await supabase.from("application_programmes").delete().eq("programme_id", id);
    } catch (err) {
      console.warn("Warning deleting linked application_programmes:", err);
    }

    // 3. Delete the programme from Supabase
    const { error: deleteErr } = await supabase
      .from("programmes")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      console.error("Delete program error:", deleteErr);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // Audit log
    try {
      await supabase.from("audit_events").insert({
        action: "PROGRAM_DELETED",
        entity_type: "programme",
        entity_id: id,
        outcome: "success",
        metadata: { programme_id: id },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, message: "Program successfully removed." });
  } catch (err: any) {
    console.error("DELETE /api/admin/programs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
