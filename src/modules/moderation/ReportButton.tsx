"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { inputClass } from "@/modules/auth/Field";
import { moderationErrorMessage, submitReport } from "./api";
import {
  MAX_REPORT_DETAILS,
  REPORT_REASONS,
  validateReport,
  type ReportReason,
  type ReportTarget,
} from "./reasons";

/** A small flag button that opens an inline report form. */
export function ReportButton({
  me,
  targetType,
  targetId,
  label = "Report",
  className = "",
}: {
  me: string;
  targetType: ReportTarget;
  targetId: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateReport(reason, details);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await submitReport(
        me,
        targetType,
        targetId,
        reason as ReportReason,
        details,
      );
      setDone(true);
    } catch (err) {
      console.error("Report failed", err);
      setError(moderationErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <span className={`text-xs text-primary ${className}`}>
        Thanks, we will review it.
      </span>
    );

  return (
    <span className={`block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
      >
        <Flag aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </button>
      {open && (
        <form
          onSubmit={submit}
          className="mt-2 w-full max-w-sm space-y-2 rounded-xl border border-line bg-surface p-3"
          noValidate
        >
          <label
            className="block text-sm font-medium"
            htmlFor={`reason-${targetId}`}
          >
            Why are you reporting this?
          </label>
          <select
            id={`reason-${targetId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
          >
            <option value="">Choose a reason</option>
            {REPORT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`details-${targetId}`}>
            Details (optional)
          </label>
          <textarea
            id={`details-${targetId}`}
            rows={2}
            maxLength={MAX_REPORT_DETAILS}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add details (optional)"
            className={inputClass}
          />
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Sending..." : "Send report"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </span>
  );
}
