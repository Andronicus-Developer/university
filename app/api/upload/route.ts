import { NextRequest, NextResponse } from "next/server";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"] as const;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = (formData.get("folder") as string) || "avatars";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds maximum allowed size of 5 MB." },
        { status: 413 }
      );
    }

    // Prevent path traversal in folder name
    const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "avatars";

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
      return NextResponse.json(
        { error: "Unsupported file format. Only JPG, PNG, WEBP, and GIF images are allowed." },
        { status: 400 }
      );
    }

    const mimeType =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
        ? "image/webp"
        : ext === "gif"
        ? "image/gif"
        : "image/png";

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Storage backend is not configured." },
        { status: 500 }
      );
    }

    const fileName = `${folder}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const storagePath = `${folder}/${fileName}`;

    // Direct upload to Supabase Storage via REST
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/public-assets/${storagePath}`,
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

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      console.error("Storage upload error:", uploadData);
      return NextResponse.json(
        { error: uploadData.message || uploadData.error || "Upload failed" },
        { status: uploadRes.status }
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/public-assets/${storagePath}`;

    return NextResponse.json({
      success: true,
      path: storagePath,
      url: publicUrl,
    });
  } catch (err: any) {
    console.error("Upload route error:", err);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
