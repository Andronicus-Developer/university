import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "avatars";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const cleanExt = ["jpg", "jpeg", "png", "webp", "svg"].includes(ext) ? ext : "png";
    const mimeType = cleanExt === "jpg" || cleanExt === "jpeg" 
      ? "image/jpeg" 
      : cleanExt === "webp" 
      ? "image/webp" 
      : cleanExt === "svg" 
      ? "image/svg+xml" 
      : "image/png";

    const fileName = `${folder}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
    const storagePath = `${folder}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Direct upload to Supabase Storage via REST
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/public-assets/${storagePath}`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": mimeType,
        "x-upsert": "true",
      },
      body: buffer,
    });

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
      { error: err.message || "Failed to process upload" },
      { status: 500 }
    );
  }
}
