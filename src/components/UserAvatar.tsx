/* eslint-disable @next/next/no-img-element -- static export, remote storage URLs */
import { avatarUrl } from "@/lib/storage";

const SIZES = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-20 w-20 text-3xl",
} as const;

export type AvatarSize = keyof typeof SIZES;

function safeUrl(path: string | null | undefined): string | null {
  try {
    return avatarUrl(path);
  } catch {
    return null;
  }
}

/** Profile photo, or the first letter of the name when there is none. */
export function UserAvatar({
  name,
  path,
  size = "md",
}: {
  name: string;
  path?: string | null;
  size?: AvatarSize;
}) {
  const url = safeUrl(path);
  const dims = SIZES[size];
  if (url) {
    return (
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className={`shrink-0 rounded-full bg-mint object-cover ${dims}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-mint font-semibold text-deep ${dims}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
