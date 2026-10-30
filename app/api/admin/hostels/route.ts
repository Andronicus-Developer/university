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

// GET: Fetch all residences and campuses
export async function GET() {
  try {
    const supabase = getAdminClient();

    // 1. Fetch residences with campus relation
    const { data: residences, error: resErr } = await supabase
      .from("residences")
      .select(`
        id,
        campus_id,
        name,
        gender_allocation,
        total_capacity,
        address,
        created_at,
        campus:campus_id(id, name, location)
      `)
      .order("name", { ascending: true });

    if (resErr) {
      console.error("Error fetching residences:", resErr);
      return NextResponse.json({ error: resErr.message }, { status: 500 });
    }

    // 2. Fetch all campuses for dropdown selection
    const { data: campuses, error: campErr } = await supabase
      .from("campuses")
      .select("id, name, location")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (campErr) {
      console.warn("Warning fetching campuses:", campErr.message);
    }

    return NextResponse.json({
      residences: residences || [],
      campuses: campuses || [],
    });
  } catch (err: any) {
    console.error("GET /api/admin/hostels error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new residence / hostel hall
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, campus_id, gender_allocation, total_capacity, address } = body;

    if (!name || !total_capacity) {
      return NextResponse.json(
        { error: "Hostel name and bed capacity are required." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Resolve default campus if none supplied
    let targetCampusId = campus_id;
    if (!targetCampusId) {
      const { data: defaultCampus } = await supabase.from("campuses").select("id").limit(1);
      targetCampusId = defaultCampus?.[0]?.id;
    }

    if (!targetCampusId) {
      return NextResponse.json({ error: "No campus found in database to associate residence with." }, { status: 400 });
    }

    const { data: newResidence, error: insertErr } = await supabase
      .from("residences")
      .insert({
        name: name.trim(),
        campus_id: targetCampusId,
        gender_allocation: gender_allocation || "mixed",
        total_capacity: Number(total_capacity),
        address: address ? address.trim() : null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert residence error:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Log Audit Event
    try {
      await supabase.from("audit_events").insert({
        action: "HOSTEL_CREATED",
        entity_type: "residence",
        entity_id: newResidence.id,
        outcome: "success",
        metadata: {
          name: newResidence.name,
          capacity: newResidence.total_capacity,
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, residence: newResidence });
  } catch (err: any) {
    console.error("POST /api/admin/hostels error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing residence / hostel hall
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, campus_id, gender_allocation, total_capacity, address } = body;

    if (!id || !name || !total_capacity) {
      return NextResponse.json(
        { error: "Hostel ID, name, and total capacity are required." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const updatePayload: any = {
      name: name.trim(),
      gender_allocation: gender_allocation || "mixed",
      total_capacity: Number(total_capacity),
      address: address ? address.trim() : null,
    };

    if (campus_id) {
      updatePayload.campus_id = campus_id;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("residences")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("Update residence error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Log Audit Event
    try {
      await supabase.from("audit_events").insert({
        action: "HOSTEL_MODIFIED",
        entity_type: "residence",
        entity_id: id,
        outcome: "success",
        metadata: {
          name,
          capacity: total_capacity,
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, residence: updated });
  } catch (err: any) {
    console.error("PUT /api/admin/hostels error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a residence hall from database
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Hostel ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Delete residence (cascade deletes hostel_rooms and maintenance_requests if defined)
    const { error: delErr } = await supabase
      .from("residences")
      .delete()
      .eq("id", id);

    if (delErr) {
      console.error("Delete residence error:", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // Log Audit Event
    try {
      await supabase.from("audit_events").insert({
        action: "HOSTEL_DELETED",
        entity_type: "residence",
        entity_id: id,
        outcome: "success",
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/hostels error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

