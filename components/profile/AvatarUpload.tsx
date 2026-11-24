"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { UserAvatar, useCurrentUserAvatar } from "@/components/profile/UserAvatar";

interface AvatarUploadProps {
  name?: string | null;
  initialUrl?: string | null;
  subtitle?: string;
  onUpdated?: (url: string | null) => void;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function AvatarUpload({
  name,
  initialUrl,
  subtitle = "JPG, PNG, or WebP up to 2 MB",
  onUpdated,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveAvatarUrl = useCurrentUserAvatar(initialUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displaySrc = previewUrl || liveAvatarUrl || initialUrl || null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(null);

    if (!ALLOWED_TYPES.has(file.type) && !/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setFeedback({ type: "error", text: "Please select a JPG, PNG, or WebP image." });
      return;
    }

    if (file.size > MAX_BYTES) {
      setFeedback({ type: "error", text: "Image exceeds the 2 MB maximum file size." });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPreviewUrl(null);
        throw new Error(json?.error || "Failed to upload profile picture.");
      }

      const nextUrl = json.avatarUrl || null;
      setPreviewUrl(null);
      window.dispatchEvent(
        new CustomEvent("user_avatar_updated", { detail: { avatarUrl: nextUrl } })
      );
      onUpdated?.(nextUrl);
      setFeedback({ type: "success", text: "Profile photo updated." });
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Upload failed." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto() {
    setRemoving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to remove photo.");
      setPreviewUrl(null);
      window.dispatchEvent(
        new CustomEvent("user_avatar_updated", { detail: { avatarUrl: null } })
      );
      onUpdated?.(null);
      setFeedback({ type: "success", text: "Profile photo removed." });
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Could not remove photo." });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <UserAvatar src={displaySrc} name={name} size="xl" shape="rounded" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || removing}
            aria-label="Upload profile photo"
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Profile Picture
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          {feedback && (
            <p
              className={`text-xs font-semibold ${
                feedback.type === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {feedback.text}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || removing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              <span>{displaySrc ? "Change Photo" : "Upload Photo"}</span>
            </>
          )}
        </button>

        {displaySrc && (
          <button
            type="button"
            onClick={handleRemovePhoto}
            disabled={uploading || removing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {removing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>Remove Photo</span>
          </button>
        )}
      </div>
    </div>
  );
}
