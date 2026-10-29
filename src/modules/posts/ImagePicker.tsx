"use client";

/* eslint-disable @next/next/no-img-element -- local blob preview */
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { validateImageFile } from "@/lib/image";

/** Choose one photo to attach. Shows a preview and reports the file (or null) to the parent. */
export function ImagePicker({
  file,
  onChange,
  disabled = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="space-y-2">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Attach a photo"
        tabIndex={-1}
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          e.target.value = "";
          if (!picked) return;
          const problem = validateImageFile(picked);
          setError(problem);
          if (!problem) onChange(picked);
        }}
      />
      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Selected photo preview"
            className="max-h-48 rounded-xl border border-line"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove photo"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}
      {!preview && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:border-primary disabled:opacity-60"
        >
          <ImagePlus aria-hidden="true" className="h-4 w-4 text-primary" />
          Photo
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
