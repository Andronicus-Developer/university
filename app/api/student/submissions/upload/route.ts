import { NextRequest, NextResponse } from "next/server";
import { resolveStudentRequestContext } from "@/lib/student/student-context";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function POST(req: NextRequest) {
  try {
    const { ctx, errorResponse } = await resolveStudentRequestContext(req);
    if (errorResponse || !ctx) {
      return (
        errorResponse ||
        NextResponse.json({ error: "Authentication required." }, { status: 401 })
      );
    }

    if (!ctx.student?.id) {
      return NextResponse.json(
        { error: "Student profile not linked to your account." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds maximum allowed size of 10 MB." },
        { status: 413 }
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const mimeType = MIME_BY_EXT[ext];
    if (!mimeType) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Allowed formats: PDF, Word, PowerPoint, Excel, TXT, CSV, ZIP, and images (JPG, PNG, WEBP).",
        },
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
        { error: "Storage backend is not configured." },
        { status: 500 }
      );
    }

    const safeBase = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 48);
    const objectName = `${safeBase || "submission"}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const bucketPath = `${ctx.schoolId}/${ctx.student.id}/${objectName}`;

    const uploadToBucket = async (bucket: string, pathInBucket: string) => {
      return fetch(
        `${supabaseUrl}/storage/v1/object/${bucket}/${pathInBucket}`,
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
    };

    let targetBucket = "submissions";
    let targetPath = bucketPath;
    let uploadRes = await uploadToBucket(targetBucket, targetPath);

    // Fallback cleanly to `public-assets` if `submissions` bucket migration is not yet applied
    if (!uploadRes.ok && (uploadRes.status === 404 || uploadRes.status === 400)) {
      const errBody = await uploadRes.clone().json().catch(() => ({}));
      const msg = String(errBody?.message || errBody?.error || "").toLowerCase();
      if (msg.includes("bucket") || uploadRes.status === 404) {
        targetBucket = "public-assets";
        targetPath = `submissions/${bucketPath}`;
        uploadRes = await uploadToBucket(targetBucket, targetPath);
      }
    }

    const uploadJson = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      return NextResponse.json(
        {
          error:
            uploadJson?.message ||
            uploadJson?.error ||
            "Failed to upload coursework file.",
        },
        { status: uploadRes.status }
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${targetBucket}/${targetPath}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      path: targetPath,
      bucket: targetBucket,
    });
  } catch (err: any) {
    console.error("Student submission upload error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to upload submission." },
      { status: 500 }
    );
  }
}
