import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import {
  resolveAdminTenantRequest,
  resolveTargetSchoolForMutation,
} from "@/lib/admin/tenant-provisioning";

export async function GET(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const db = createDirectAdminClient() as any;
    let q = db
      .from("transport_routes")
      .select("*")
      .order("route_code", { ascending: true });
    if (tenant.schoolId) q = q.eq("school_id", tenant.schoolId);

    const { data: routesData, error } = await q;
    if (error) {
      return NextResponse.json({
        routes: [],
        stats: { totalRoutes: 0, activeRoutes: 0, totalCapacity: 0, activeVehicles: 0 },
        missingTables: ["transport_routes"],
      });
    }

    const routes = (routesData || []).map((r: any) => ({
      id: r.id,
      route_name: r.route_name,
      route_code: r.route_code,
      departure_location: r.departure_location,
      arrival_location: r.arrival_location,
      departure_time: r.departure_time ? String(r.departure_time).slice(0, 5) : "07:30",
      stops: Array.isArray(r.stops) ? r.stops : [],
      fare_amount: Number(r.fare_amount || 0),
      is_active: r.is_active ?? true,
      vehicle_id: r.id,
      bus_number: r.bus_number || "Unassigned",
      model: r.model || "Standard Campus Shuttle",
      capacity: Number(r.capacity || 40),
      driver_name: r.driver_name || "Assigned Driver",
      driver_phone: r.driver_phone || "",
      vehicle_status: r.vehicle_status || "active",
    }));

    return NextResponse.json({
      routes,
      stats: {
        totalRoutes: routes.length,
        activeRoutes: routes.filter((r: any) => r.is_active).length,
        totalCapacity: routes.reduce((s: number, r: any) => s + Number(r.capacity || 0), 0),
        activeVehicles: routes.filter((r: any) => r.vehicle_status === "active").length,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/transport error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    if (!body?.route_name?.trim() || !body?.route_code?.trim()) {
      return NextResponse.json(
        { error: "Route name and route code are required." },
        { status: 400 }
      );
    }

    const targetSchool = await resolveTargetSchoolForMutation(tenant, body.school_id);
    if (targetSchool.errorResponse) return targetSchool.errorResponse;
    const schoolId = targetSchool.schoolId;

    const db = createDirectAdminClient() as any;
    const { data, error } = await db
      .from("transport_routes")
      .insert({
        school_id: schoolId,
        route_name: body.route_name.trim(),
        route_code: body.route_code.trim().toUpperCase(),
        departure_location: String(body.departure_location || "Main Gate").trim(),
        arrival_location: String(body.arrival_location || "City Center").trim(),
        departure_time: String(body.departure_time || "07:30"),
        fare_amount: Number(body.fare_amount || 0),
        bus_number: body.bus_number ? String(body.bus_number).trim() : "Unassigned",
        model: body.model ? String(body.model).trim() : "Standard Campus Shuttle",
        capacity: Number(body.capacity || 40),
        driver_name: body.driver_name ? String(body.driver_name).trim() : null,
        driver_phone: body.driver_phone ? String(body.driver_phone).trim() : null,
        is_active: body.is_active !== false,
        vehicle_status: "active",
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ route: data, success: true });
  } catch (err: any) {
    console.error("POST /api/admin/transport error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    if (!body?.id) {
      return NextResponse.json({ error: "Route ID is required." }, { status: 400 });
    }

    const db = createDirectAdminClient() as any;
    let q = db
      .from("transport_routes")
      .update({
        route_name: String(body.route_name || "").trim(),
        route_code: String(body.route_code || "").trim().toUpperCase(),
        departure_location: String(body.departure_location || "").trim(),
        arrival_location: String(body.arrival_location || "").trim(),
        departure_time: String(body.departure_time || "07:30"),
        fare_amount: Number(body.fare_amount || 0),
        bus_number: body.bus_number ? String(body.bus_number).trim() : "Unassigned",
        model: body.model ? String(body.model).trim() : "Standard Campus Shuttle",
        capacity: Number(body.capacity || 40),
        driver_name: body.driver_name ? String(body.driver_name).trim() : null,
        driver_phone: body.driver_phone ? String(body.driver_phone).trim() : null,
        is_active: body.is_active !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id);

    if (tenant.schoolId) q = q.eq("school_id", tenant.schoolId);

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT /api/admin/transport error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenant, errorResponse } = await resolveAdminTenantRequest(req);
    if (errorResponse) return errorResponse;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Route ID is required." }, { status: 400 });
    }

    const db = createDirectAdminClient() as any;
    let q = db.from("transport_routes").delete().eq("id", id);
    if (tenant.schoolId) q = q.eq("school_id", tenant.schoolId);

    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/transport error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
