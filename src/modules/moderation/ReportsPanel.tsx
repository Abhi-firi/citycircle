"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { timeAgo } from "@/modules/posts/text";
import {
  closeReport,
  fetchReports,
  liftSuspension,
  moderationErrorMessage,
  removeReportedContent,
  suspendMember,
  type AdminReport,
} from "./api";
import { reasonLabel } from "./reasons";

export function ReportsPanel({ adminId }: { adminId: string }) {
  const [view, setView] = useState<"open" | "closed">("open");
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    fetchReports(view).then(
      (r) => {
        if (!active) return;
        setReports(r);
        setFailed(false);
      },
      (err) => {
        console.error("Could not load reports", err);
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [view, reload]);

  async function act(task: () => Promise<void>) {
    setMessage(null);
    try {
      await task();
      setReload((n) => n + 1);
    } catch (err) {
      console.error("Moderation action failed", err);
      setMessage(moderationErrorMessage(err));
    }
  }

  const tab = (key: "open" | "closed", label: string) => (
    <button
      type="button"
      onClick={() => {
        setReports(null);
        setView(key);
      }}
      aria-pressed={view === key}
      className={
        view === key
          ? "rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-on-primary"
          : "rounded-full bg-mint px-4 py-1.5 text-sm font-medium text-primary hover:opacity-80"
      }
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {tab("open", "Open")}
        {tab("closed", "Closed")}
      </div>
      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
      {failed ? (
        <p className="text-sm text-muted">
          Could not load reports. Refresh the page.
        </p>
      ) : reports === null ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : reports.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          {view === "open"
            ? "No open reports. All clear."
            : "No closed reports yet."}
        </Card>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <Card as="div" key={r.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded-full bg-mint px-2 py-0.5 font-medium text-primary">
                  {r.targetType}
                </span>
                <span>{reasonLabel(r.reason)}</span>
                <span>· {timeAgo(r.createdAt)}</span>
                <span>· reported by {r.reporterName}</span>
                {r.status !== "open" && <span>· {r.status}</span>}
              </div>
              <p className="text-sm">
                <span className="font-medium">{r.authorName}</span>
                {r.authorSuspended && (
                  <span className="ml-2 text-xs text-red-600">suspended</span>
                )}
              </p>
              {r.excerpt && (
                <p className="whitespace-pre-wrap break-words rounded-lg bg-pale px-3 py-2 text-sm">
                  {r.excerpt}
                </p>
              )}
              {r.details && (
                <p className="text-sm text-muted">Reporter says: {r.details}</p>
              )}
              <div className="flex flex-wrap gap-2 text-sm">
                {r.targetType === "member" && (
                  <Link
                    href={`/members/?id=${encodeURIComponent(r.targetId)}`}
                    className="rounded-full border border-line px-3 py-1 font-medium hover:border-primary"
                  >
                    View profile
                  </Link>
                )}
                {r.status === "open" && (
                  <>
                    {r.targetType !== "member" && (
                      <button
                        type="button"
                        className="rounded-full border border-line px-3 py-1 font-medium hover:border-primary"
                        onClick={() => {
                          if (!window.confirm(`Delete this ${r.targetType}?`))
                            return;
                          void act(async () => {
                            await removeReportedContent(
                              r.targetType as "post" | "comment",
                              r.targetId,
                            );
                            await closeReport(adminId, r.id, "resolved");
                          });
                        }}
                      >
                        Remove {r.targetType}
                      </button>
                    )}
                    {r.targetAuthorId && !r.authorSuspended && (
                      <button
                        type="button"
                        className="rounded-full border border-line px-3 py-1 font-medium hover:border-primary"
                        onClick={() => {
                          const reason = window.prompt(
                            `Suspend ${r.authorName}? Add a short reason (optional):`,
                          );
                          if (reason === null) return;
                          void act(async () => {
                            await suspendMember(
                              adminId,
                              r.targetAuthorId as string,
                              reason,
                            );
                            await closeReport(adminId, r.id, "resolved");
                          });
                        }}
                      >
                        Suspend member
                      </button>
                    )}
                    {r.targetAuthorId && r.authorSuspended && (
                      <button
                        type="button"
                        className="rounded-full border border-line px-3 py-1 font-medium hover:border-primary"
                        onClick={() =>
                          void act(() =>
                            liftSuspension(r.targetAuthorId as string),
                          )
                        }
                      >
                        Lift suspension
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-full bg-primary px-3 py-1 font-medium text-on-primary hover:opacity-90"
                      onClick={() =>
                        void act(() => closeReport(adminId, r.id, "resolved"))
                      }
                    >
                      Mark resolved
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-line px-3 py-1 font-medium hover:border-primary"
                      onClick={() =>
                        void act(() => closeReport(adminId, r.id, "dismissed"))
                      }
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
