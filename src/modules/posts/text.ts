export const MAX_POST = 3000;
export const MAX_COMMENT = 1000;

/** Returns an error message, or null when the text is fine. */
export function validateBody(text: string, max: number): string | null {
  const t = text.trim();
  if (t.length === 0) return "Write something first.";
  if (t.length > max) return `Keep it under ${max} characters.`;
  return null;
}

/** Short relative time such as "just now", "5m", "3h", "2d", or a date for older items. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (Number.isNaN(seconds) || seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return then.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
