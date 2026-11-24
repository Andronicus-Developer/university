import { NextRequest, NextResponse } from "next/server";
import { createDirectAdminClient } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/supabase/middleware";
import { resolveTenantContextFromHeaders } from "@/lib/saas/tenant-context";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function isMissingColOrTable(err: any): boolean {
  const code = String(err?.code || "");
  const msg = String(err?.message || "").toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find")
  );
}

async function resolveCurrentUser(req: NextRequest) {
  const cookies = req.cookies
    .getAll()
    .map((c) => ({ name: c.name, value: c.value }));
  const tenantCtx = resolveTenantContextFromHeaders(req.headers, cookies);
  const { user } = await updateSession(req).catch(() => ({ user: null as any }));

  const userId = String(user?.id || tenantCtx.userId || "").trim();
  const email = String(user?.email || tenantCtx.email || "")
    .trim()
    .toLowerCase();

  return { user, userId, email, isAuthed: Boolean(userId || tenantCtx.isAuthenticated) };
}

async function ensureAvatarsBucket(supabaseUrl: string, serviceRoleKey: string) {
  try {
    const checkRes = await fetch(`${supabaseUrl}/storage/v1/bucket/avatars`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (checkRes.ok) return;

    await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "avatars",
        name: "avatars",
        public: true,
        file_size_limit: MAX_AVATAR_BYTES,
        allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
      }),
    });
  } catch {
    // non-blocking
  }
}

async function syncAvatarAcrossTables(
  db: any,
  user: any,
  userId: string,
  email: string,
  avatarUrl: string | null
) {
  // 1. Auth user_metadata
  if (userId) {
    try {
      const nextMeta = {
        ...(user?.user_metadata || {}),
        avatar_url: avatarUrl || "",
      };
      await db.auth.admin.updateUserById(userId, { user_metadata: nextMeta });
    } catch {
      // ignore if user isn't in standard auth table
    }
  }

  // 2. public.profiles
  if (userId) {
    const { error } = await db
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId);
    if (error && !isMissingColOrTable(error)) {
      console.warn("[avatar sync] profiles error:", error.message);
    }
  }

  // 3. public.students
  if (userId) {
    const { error } = await db
      .from("students")
      .update({ avatar_url: avatarUrl })
      .eq("profile_id", userId);
    if (error && isMissingColOrTable(error)) {
      // ignore pending column migration
    } else if (!error && email) {
      await db
        .from("students")
        .update({ avatar_url: avatarUrl })
        .ilike("email", email)
        .is("profile_id", null)
        .then(() => null, () => null);
    }
  }

  // 4. public.staff_profiles
  if (userId) {
    const { error } = await db
      .from("staff_profiles")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", userId);
    if (!error && email) {
      await db
        .from("staff_profiles")
        .update({ avatar_url: avatarUrl })
        .ilike("email", email)
        .is("user_id", null)
        .then(() => null, () => null);
    }
  }

  // 5. public.parent_guardians
  if (userId) {
    const { error } = await db
      .from("parent_guardians")
      .update({ avatar_url: avatarUrl })
      .eq("user_id", userId);
    if (!error && email) {
      await db
        .from("parent_guardians")
        .update({ avatar_url: avatarUrl })
        .ilike("email", email)
        .is("user_id", null)
        .then(() => null, () => null);
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user, userId, email, isAuthed } = await resolveCurrentUser(req);
    if (!isAuthed || !userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const db = createDirectAdminClient() as any;

    let avatarUrl = String(user?.user_metadata?.avatar_url || "").trim();

    const safeLookup = async (table: string, col: string, val: string) => {
      try {
        const { data, error } = await db
          .from(table)
          .select("avatar_url")
          .eq(col, val)
          .maybeSingle();
        if (!error && data?.avatar_url) return String(data.avatar_url);
      } catch {
        // ignore missing column/table
      }
      return "";
    };

    if (!avatarUrl) avatarUrl = await safeLookup("profiles", "id", userId);
    if (!avatarUrl) avatarUrl = await safeLookup("students", "profile_id", userId);
    if (!avatarUrl) avatarUrl = await safeLookup("staff_profiles", "user_id", userId);
    if (!avatarUrl) avatarUrl = await safeLookup("parent_guardians", "user_id", userId);

    if (!avatarUrl && email) {
      try {
        const { data: pEmail } = await db
          .from("profiles")
          .select("avatar_url")
          .ilike("email", email)
          .maybeSingle();
        if (pEmail?.avatar_url) avatarUrl = String(pEmail.avatar_url);
      } catch {
        // ignore
      }
    }

    return NextResponse.json(
      { avatarUrl: avatarUrl || null, userId },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    if (err?.digest === "NEXT_PRERENDER_INTERRUPTED") throw err;
    return NextResponse.json(
      { error: err?.message || "Failed to resolve profile photo." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, userId, email, isAuthed } = await resolveCurrentUser(req);
    if (!isAuthed || !userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const formData = await req.formData().catch(() => null);
    const file = formData?.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds maximum allowed size of 2 MB." },
        { status: 413 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const mimeType = ALLOWED_MIME_BY_EXT[ext] || (ALLOWED_MIME_BY_EXT[file.type] ? file.type : "");
    const normalizedExt = ALLOWED_MIME_BY_EXT[ext]
      ? ext
      : file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
      ? "webp"
      : file.type === "image/jpeg"
      ? "jpg"
      : "";

    if (!normalizedExt || !mimeType) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WebP images are supported." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase Storage backend is not configured." },
        { status: 500 }
      );
    }

    await ensureAvatarsBucket(supabaseUrl, serviceRoleKey);

    const safeUserFolder = userId.replace(/[^a-zA-Z0-9_-]/g, "");
    const objectPath = `${safeUserFolder}/avatar_${Date.now()}.${normalizedExt}`;

    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/avatars/${objectPath}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        body: buffer,
      }
    );

    const uploadJson = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      return NextResponse.json(
        { error: uploadJson?.message || uploadJson?.error || "Avatar upload failed." },
        { status: uploadRes.status }
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${objectPath}`;
    const db = createDirectAdminClient() as any;
    await syncAvatarAcrossTables(db, user, userId, email, publicUrl);

    return NextResponse.json({
      success: true,
      avatarUrl: publicUrl,
      path: objectPath,
    });
  } catch (err: any) {
    console.error("POST /api/profile/avatar error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload avatar." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, userId, email, isAuthed } = await resolveCurrentUser(req);
    if (!isAuthed || !userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const db = createDirectAdminClient() as any;
    const currentUrl = String(user?.user_metadata?.avatar_url || "");
    const marker = "/storage/v1/object/public/avatars/";
    const idx = currentUrl.indexOf(marker);
    if (idx >= 0) {
      const objectPath = currentUrl.slice(idx + marker.length).split("?")[0];
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey && objectPath) {
        await fetch(`${supabaseUrl}/storage/v1/object/avatars/${objectPath}`, {
          method: "DELETE",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }).catch(() => null);
      }
    }

    await syncAvatarAcrossTables(db, user, userId, email, null);
    return NextResponse.json({ success: true, avatarUrl: null });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to remove avatar." },
      { status: 500 }
    );
  }
}
