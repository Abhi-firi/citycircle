export const REPORT_REASONS = [
  { value: "spam", label: "Spam or promotion" },
  { value: "scam", label: "Scam or fake offer" },
  { value: "harassment", label: "Harassment or hate" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export type ReportTarget = "post" | "comment" | "member";
export const MAX_REPORT_DETAILS = 500;

export function reasonLabel(value: string): string {
  return REPORT_REASONS.find((r) => r.value === value)?.label ?? value;
}

/** Returns an error message, or null when the report is fine to send. */
export function validateReport(reason: string, details: string): string | null {
  if (!REPORT_REASONS.some((r) => r.value === reason))
    return "Choose a reason.";
  if (details.trim().length > MAX_REPORT_DETAILS)
    return `Keep details under ${MAX_REPORT_DETAILS} characters.`;
  return null;
}
