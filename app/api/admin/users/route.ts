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

// GET: Fetch all users, profiles, and their assigned roles
export async function GET() {
  try {
    const supabase = getAdminClient();

    // 1. Fetch profiles
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, avatar_url, account_status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (profileErr) {
      console.error("Error fetching profiles:", profileErr);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    // 2. Fetch active role assignments with role details
    const { data: assignments, error: assignErr } = await supabase
      .from("user_role_assignments")
      .select("user_id, role:role_id(id, code, name, description)")
      .eq("is_active", true);

    if (assignErr) {
      console.warn("Warning fetching assignments:", assignErr.message);
    }

    // 3. Fetch all documented roles for selection dropdowns
    const { data: roles } = await supabase
      .from("roles")
      .select("id, code, name, description")
      .order("name", { ascending: true });

    // 4. Combine in memory to eliminate foreign key ambiguity
    const roleMap = new Map();
    (assignments || []).forEach((a: any) => {
      if (a.user_id && a.role) {
        roleMap.set(a.user_id, a.role);
      }
    });

    const combinedUsers = (profiles || []).map((p: any) => {
      const assignedRole = roleMap.get(p.id);
      return {
        ...p,
        user_role_assignments: assignedRole ? [{ role: assignedRole }] : [],
        role_code: assignedRole?.code || "student",
        role_name: assignedRole?.name || "Student",
      };
    });

    return NextResponse.json({
      users: combinedUsers,
      roles: roles || [],
    });
  } catch (err: any) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new user with Auth, Profile, and Role assignment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, full_name, phone, role_code, account_status } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Email, password, and full name are required." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // 1. Create User in Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: role_code || "student",
      },
    });

    if (authErr) {
      console.error("Auth createUser error:", authErr);
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // 2. Ensure Profile Record in public.profiles
    const { error: profileErr } = await supabase
      .from("profiles")
      .upsert(
        {
          id: newUserId,
          email: email.trim().toLowerCase(),
          full_name: full_name.trim(),
          phone: phone ? phone.trim() : null,
          account_status: account_status || "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (profileErr) {
      console.error("Profile upsert error:", profileErr);
    }

    // 3. Assign Role in user_role_assignments
    if (role_code) {
      const { data: roleRow } = await supabase
        .from("roles")
        .select("id")
        .eq("code", role_code)
        .single();

      if (roleRow?.id) {
        // Remove any existing active assignments
        await supabase
          .from("user_role_assignments")
          .delete()
          .eq("user_id", newUserId);

        // Insert new assignment
        await supabase.from("user_role_assignments").insert({
          user_id: newUserId,
          role_id: roleRow.id,
          is_active: true,
        });
      }
    }

    // 4. Log Audit Event
    try {
      await supabase.from("audit_events").insert({
        action: "USER_PROVISIONED",
        entity_type: "auth_user",
        entity_id: newUserId,
        outcome: "SUCCESS",
        new_values: {
          email,
          full_name,
          role: role_code,
        },
      });
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUserId,
        email,
        full_name,
        role_code,
      },
    });
  } catch (err: any) {
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update an existing user (Profile, Role, and optional Password)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, full_name, phone, role_code, account_status, password } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Update Auth if password or email changed
    const authUpdates: any = {
      user_metadata: {
        full_name,
        role: role_code,
      },
    };

    if (password && password.trim().length >= 8) {
      authUpdates.password = password.trim();
    }
    if (email && email.trim()) {
      authUpdates.email = email.trim().toLowerCase();
    }

    const { error: authErr } = await supabase.auth.admin.updateUserById(id, authUpdates);
    if (authErr) {
      console.warn("Auth update warning:", authErr.message);
    }

    // 2. Update Profile in public.profiles
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        full_name: full_name?.trim(),
        phone: phone ? phone.trim() : null,
        account_status: account_status || "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (profileErr) {
      console.error("Profile update error:", profileErr);
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    // 3. Update Role Assignment
    if (role_code) {
      const { data: roleRow } = await supabase
        .from("roles")
        .select("id")
        .eq("code", role_code)
        .single();

      if (roleRow?.id) {
        // Clear old assignments for this user
        await supabase
          .from("user_role_assignments")
          .delete()
          .eq("user_id", id);

        // Insert new assignment
        await supabase.from("user_role_assignments").insert({
          user_id: id,
          role_id: roleRow.id,
          is_active: true,
        });
      }
    }

    // 4. Log Audit Event
    try {
      await supabase.from("audit_events").insert({
        action: "USER_MODIFIED",
        entity_type: "auth_user",
        entity_id: id,
        outcome: "SUCCESS",
        new_values: {
          email,
          full_name,
          role: role_code,
        },
      });
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT /api/admin/users error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a user from Auth, Profiles, and Role assignments
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Delete user role assignments
    await supabase
      .from("user_role_assignments")
      .delete()
      .eq("user_id", id);

    // 2. Delete from profiles
    await supabase
      .from("profiles")
      .delete()
      .eq("id", id);

    // 3. Delete from Supabase Auth
    const { error: authErr } = await supabase.auth.admin.deleteUser(id);
    if (authErr) {
      console.warn("Auth delete warning (might be non-auth user):", authErr.message);
    }

    // 4. Log Audit Event
    try {
      await supabase.from("audit_events").insert({
        action: "USER_DELETED",
        entity_type: "auth_user",
        entity_id: id,
        outcome: "success",
      });
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/users error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
