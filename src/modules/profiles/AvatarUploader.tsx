"use client";

import { useRef, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { validateImageFile } from "@/lib/image";
import { removeAvatar, uploadAvatar } from "@/lib/storage";

/** Profile photo with Change and Remove. Reports the new path (or null) after each change. */
export function AvatarUploader({
  userId,
  name,
  path,
  onChange,
}: {
  userId: string;
  name: string;
  path: string | null;
  onChange: (path: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File) {
    const problem = validateImageFile(file);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadAvatar(userId, file, path));
    } catch (err) {
      console.error("Photo upload failed", err);
      const code =
        (err as { statusCode?: string; code?: string }).statusCode ??
        (err as { code?: string }).code;
      setError(
        `Could not upload your photo. Please try again.${code ? ` (code: ${code})` : ""}`,
      );
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError(null);
    try {
      await removeAvatar(userId, path);
      onChange(null);
    } catch (err) {
      console.error("Photo removal failed", err);
      setError("Could not remove your photo. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <UserAvatar name={name} path={path} size="xl" />
      <div className="space-y-2">
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Choose a profile photo"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void pick(file);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Working..." : path ? "Change photo" : "Add photo"}
          </button>
          {path && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void clear()}
              className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:border-primary disabled:opacity-60"
            >
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          JPG, PNG or WebP. It is cropped to a square.
        </p>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
