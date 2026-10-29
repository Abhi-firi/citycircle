"use client";

/* eslint-disable @next/next/no-img-element -- static export, signed storage URLs */
import { useEffect, useState } from "react";
import { signedPostImageUrls } from "@/lib/storage";

const cache = new Map<string, { url: string; expires: number }>();

/** A private post image, shown through a short-lived signed link. */
export function PostImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(() => {
    const hit = cache.get(path);
    return hit && hit.expires > Date.now() ? hit.url : null;
  });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (url) return;
    let active = true;
    signedPostImageUrls([path]).then(
      (urls) => {
        const found = urls[path];
        if (!active) return;
        if (found) {
          cache.set(path, { url: found, expires: Date.now() + 50 * 60 * 1000 });
          setUrl(found);
        } else setFailed(true);
      },
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [path, url]);

  if (failed)
    return (
      <p className="rounded-xl bg-pale p-4 text-sm text-muted">
        This photo could not be loaded.
      </p>
    );
  if (!url)
    return (
      <div
        className="h-48 animate-pulse rounded-xl bg-pale"
        aria-hidden="true"
      />
    );
  return (
    <img
      src={url}
      alt="Photo attached to the post"
      loading="lazy"
      className="max-h-[32rem] w-full rounded-xl border border-line object-cover"
    />
  );
}
