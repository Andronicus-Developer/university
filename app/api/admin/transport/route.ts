import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// GET: Fetch all routes with their assigned vehicles and fleet statistics
export async function GET() {
  try {
    const supabase = getAdminClient();

    // 1. Fetch transport routes
    const { data: routesData, error: routesErr } = await supabase
      .from("transport_routes")
      .select(`
        id,
        route_name,
        route_code,
        departure_location,
        arrival_location,
        departure_time,
        stops,
        fare_amount,
        is_active,
        created_at,
        updated_at
      `)
      .order("route_code", { ascending: true });

    if (routesErr) {
      console.error("Error fetching transport routes:", routesErr);
      return NextResponse.json({ error: routesErr.message }, { status: 500 });
    }

    // 2. Fetch transport vehicles
    const { data: vehiclesData, error: vehiclesErr } = await supabase
      .from("transport_vehicles")
      .select(`
        id,
        bus_number,
        model,
        capacity,
        driver_name,
        driver_phone,
        route_id,
        status,
        created_at,
        updated_at
      `);

    if (vehiclesErr) {
      console.warn("Warning fetching transport vehicles:", vehiclesErr.message);
    }

    // Map vehicles by route_id
    const vehicleMap = new Map();
    if (vehiclesData) {
      vehiclesData.forEach((v: any) => {
        if (v.route_id) {
          vehicleMap.set(v.route_id, v);
        }
      });
    }

    const combinedRoutes = (routesData || []).map((r: any) => {
      const v = vehicleMap.get(r.id);
      return {
        id: r.id,
        route_name: r.route_name,
        route_code: r.route_code,
        departure_location: r.departure_location,
        arrival_location: r.arrival_location,
        departure_time: r.departure_time ? r.departure_time.slice(0, 5) : "07:30",
        stops: Array.isArray(r.stops) ? r.stops : [],
        fare_amount: Number(r.fare_amount || 0),
        is_active: r.is_active ?? true,
        vehicle_id: v?.id || null,
        bus_number: v?.bus_number || "Unassigned",
        model: v?.model || "Standard Campus Shuttle",
        capacity: Number(v?.capacity || 40),
        driver_name: v?.driver_name || "Assigned Driver",
        driver_phone: v?.driver_phone || "+233 24 000 0000",
        vehicle_status: v?.status || "active",
      };
    });

    // Compute fleet KPI summary
    const totalCapacity = combinedRoutes.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const activeRoutes = combinedRoutes.filter((r) => r.is_active).length;

    return NextResponse.json({
      routes: combinedRoutes,
      stats: {
        totalRoutes: combinedRoutes.length,
        activeRoutes,
        totalVehicles: vehiclesData?.length || combinedRoutes.length,
        totalCapacity,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/transport error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Provision a new shuttle route and assigned vehicle
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      route_name,
      route_code,
      departure_location,
      arrival_location,
      departure_time,
      fare_amount,
      stops,
      is_active,
      bus_number,
      model,
      capacity,
      driver_name,
      driver_phone,
    } = body;

    if (!route_name?.trim() || !route_code?.trim()) {
      return NextResponse.json(
        { error: "Route name and route code are required." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 1. Insert transport route
    const { data: newRoute, error: routeErr } = await supabase
      .from("transport_routes")
      .insert({
        route_name: route_name.trim(),
        route_code: route_code.trim().toUpperCase(),
        departure_location: (departure_location || "Campus Main Gate").trim(),
        arrival_location: (arrival_location || "Destination Terminal").trim(),
        departure_time: departure_time || "07:30:00",
        fare_amount: Number(fare_amount || 0),
        stops: Array.isArray(stops) ? stops : [],
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (routeErr) {
      console.error("Error creating transport route:", routeErr);
      return NextResponse.json({ error: routeErr.message }, { status: 500 });
    }

    // 2. Insert assigned vehicle linked to route
    const { data: newVehicle, error: vehicleErr } = await supabase
      .from("transport_vehicles")
      .insert({
        route_id: newRoute.id,
        bus_number: (bus_number || `UMS-BUS-${Math.floor(10 + Math.random() * 90)}`).trim(),
        model: (model || "Mercedes-Benz Sprinter").trim(),
        capacity: Number(capacity) || 40,
        driver_name: (driver_name || "Campus Driver").trim(),
        driver_phone: (driver_phone || "+233 24 555 0100").trim(),
        status: "active",
      })
      .select()
      .single();

    if (vehicleErr) {
      console.warn("Warning inserting vehicle:", vehicleErr.message);
    }

    // 3. Log audit event
    try {
      await supabase.from("audit_events").insert({
        action: "TRANSPORT_ROUTE_CREATED",
        entity_type: "transport_route",
        entity_id: newRoute.id,
        outcome: "success",
        metadata: {
          route_code: newRoute.route_code,
          route_name: newRoute.route_name,
          bus_number: newVehicle?.bus_number,
          driver: newVehicle?.driver_name,
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      route: newRoute,
      vehicle: newVehicle,
    });
  } catch (err: any) {
    console.error("POST /api/admin/transport error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing shuttle route and assigned vehicle
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      route_name,
      route_code,
      departure_location,
      arrival_location,
      departure_time,
      fare_amount,
      stops,
      is_active,
      bus_number,
      model,
      capacity,
      driver_name,
      driver_phone,
      vehicle_id,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Route ID is required for update." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Update transport route
    const updateRoutePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (route_name !== undefined) updateRoutePayload.route_name = route_name.trim();
    if (route_code !== undefined) updateRoutePayload.route_code = route_code.trim().toUpperCase();
    if (departure_location !== undefined) updateRoutePayload.departure_location = departure_location.trim();
    if (arrival_location !== undefined) updateRoutePayload.arrival_location = arrival_location.trim();
    if (departure_time !== undefined) updateRoutePayload.departure_time = departure_time;
    if (fare_amount !== undefined) updateRoutePayload.fare_amount = Number(fare_amount);
    if (stops !== undefined) updateRoutePayload.stops = Array.isArray(stops) ? stops : [];
    if (is_active !== undefined) updateRoutePayload.is_active = Boolean(is_active);

    const { error: routeUpdateErr } = await supabase
      .from("transport_routes")
      .update(updateRoutePayload)
      .eq("id", id);

    if (routeUpdateErr) {
      console.error("Error updating transport route:", routeUpdateErr);
      return NextResponse.json({ error: routeUpdateErr.message }, { status: 500 });
    }

    // 2. Update or upsert assigned vehicle
    if (bus_number || driver_name || capacity || model || driver_phone) {
      const vehiclePayload: any = {
        updated_at: new Date().toISOString(),
      };
      if (bus_number !== undefined) vehiclePayload.bus_number = bus_number.trim();
      if (model !== undefined) vehiclePayload.model = model.trim();
      if (capacity !== undefined) vehiclePayload.capacity = Number(capacity);
      if (driver_name !== undefined) vehiclePayload.driver_name = driver_name.trim();
      if (driver_phone !== undefined) vehiclePayload.driver_phone = driver_phone.trim();

      if (vehicle_id) {
        await supabase
          .from("transport_vehicles")
          .update(vehiclePayload)
          .eq("id", vehicle_id);
      } else {
        // Try to update by route_id
        const { data: existingV } = await supabase
          .from("transport_vehicles")
          .select("id")
          .eq("route_id", id)
          .maybeSingle();

        if (existingV) {
          await supabase
            .from("transport_vehicles")
            .update(vehiclePayload)
            .eq("id", existingV.id);
        } else {
          // Insert new vehicle linked to route
          await supabase.from("transport_vehicles").insert({
            ...vehiclePayload,
            route_id: id,
            status: "active",
          });
        }
      }
    }

    // 3. Log audit event
    try {
      await supabase.from("audit_events").insert({
        action: "TRANSPORT_ROUTE_UPDATED",
        entity_type: "transport_route",
        entity_id: id,
        outcome: "success",
        metadata: {
          route_code,
          route_name,
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT /api/admin/transport error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a route and any associated vehicle
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Route ID is required for deletion." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Delete associated vehicle(s) first to respect foreign key constraint
    const { error: vehDeleteErr } = await supabase
      .from("transport_vehicles")
      .delete()
      .eq("route_id", id);

    if (vehDeleteErr) {
      console.warn("Warning deleting associated transport vehicle:", vehDeleteErr.message);
    }

    // 2. Delete the transport route
    const { error: routeDeleteErr } = await supabase
      .from("transport_routes")
      .delete()
      .eq("id", id);

    if (routeDeleteErr) {
      console.error("Error deleting transport route:", routeDeleteErr);
      return NextResponse.json({ error: routeDeleteErr.message }, { status: 500 });
    }

    // 3. Log audit event
    try {
      await supabase.from("audit_events").insert({
        action: "TRANSPORT_ROUTE_DELETED",
        entity_type: "transport_route",
        entity_id: id,
        outcome: "success",
        metadata: { route_id: id },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true, message: "Transport route and vehicle removed." });
  } catch (err: any) {
    console.error("DELETE /api/admin/transport error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

