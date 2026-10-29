import { getSupabase } from "@/lib/supabase/client";
import { fetchPeople } from "@/modules/network/api";
import type { ReportReason, ReportTarget } from "./reasons";

export async function submitReport(
  me: string,
  targetType: ReportTarget,
  targetId: string,
  reason: ReportReason,
  details: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("reports")
    .insert({
      reporter_id: me,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
  // 23505: this member already reported it. Treat as done.
  if (error && error.code !== "23505") throw error;
}

export async function blockMember(me: string, other: string): Promise<void> {
  const { error } = await getSupabase()
    .from("blocks")
    .insert({ blocker_id: me, blocked_id: other });
  if (error && error.code !== "23505") throw error;
}

export async function unblockMember(me: string, other: string): Promise<void> {
  const { error } = await getSupabase()
    .from("blocks")
    .delete()
    .match({ blocker_id: me, blocked_id: other });
  if (error) throw error;
}

export type BlockedMember = { id: string; name: string };

export async function fetchBlockedMembers(): Promise<BlockedMember[]> {
  const { data, error } = await getSupabase().rpc("my_blocked_members");
  if (error) throw error;
  return ((data ?? []) as { id: string; full_name: string }[]).map((r) => ({
    id: r.id,
    name: r.full_name,
  }));
}

export type AdminReport = {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  targetAuthorId: string | null;
  excerpt: string;
  reason: string;
  details: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  reporterName: string;
  authorName: string;
  authorSuspended: boolean;
};

export async function fetchReports(
  status: "open" | "closed",
): Promise<AdminReport[]> {
  const db = getSupabase();
  let query = db
    .from("reports")
    .select(
      "id, target_type, target_id, target_author_id, target_excerpt, reason, details, status, created_at, reporter_id",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  query =
    status === "open"
      ? query.eq("status", "open")
      : query.neq("status", "open");
  const { data, error } = await query;
  if (error) throw error;
  type Row = {
    id: string;
    target_type: ReportTarget;
    target_id: string;
    target_author_id: string | null;
    target_excerpt: string | null;
    reason: string;
    details: string | null;
    status: "open" | "resolved" | "dismissed";
    created_at: string;
    reporter_id: string;
  };
  const rows = (data ?? []) as Row[];
  const ids = [
    ...new Set(
      rows.flatMap((r) => [
        r.reporter_id,
        ...(r.target_author_id ? [r.target_author_id] : []),
      ]),
    ),
  ];
  const [people, suspended] = await Promise.all([
    fetchPeople(ids).catch(() => ({})),
    db.from("suspensions").select("user_id"),
  ]);
  const suspendedIds = new Set(
    ((suspended.data ?? []) as { user_id: string }[]).map((s) => s.user_id),
  );
  const nameOf = (id: string | null) =>
    id
      ? ((people as Record<string, { name: string }>)[id]?.name ?? "Unknown")
      : "Unknown";
  return rows.map((r) => ({
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    targetAuthorId: r.target_author_id,
    excerpt: r.target_excerpt ?? "",
    reason: r.reason,
    details: r.details ?? "",
    status: r.status,
    createdAt: r.created_at,
    reporterName: nameOf(r.reporter_id),
    authorName: nameOf(r.target_author_id),
    authorSuspended: r.target_author_id
      ? suspendedIds.has(r.target_author_id)
      : false,
  }));
}

export async function closeReport(
  adminId: string,
  reportId: string,
  status: "resolved" | "dismissed",
): Promise<void> {
  const { error } = await getSupabase()
    .from("reports")
    .update({
      status,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) throw error;
}

export async function removeReportedContent(
  type: "post" | "comment",
  id: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from(type === "post" ? "posts" : "comments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function suspendMember(
  adminId: string,
  userId: string,
  reason: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("suspensions")
    .insert({
      user_id: userId,
      reason: reason.slice(0, 500) || null,
      created_by: adminId,
    });
  if (error && error.code !== "23505") throw error;
}

export async function liftSuspension(userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("suspensions")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

export function moderationErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code;
  if (code === "23514")
    return "You have reached today's limit. Please try again tomorrow.";
  return `Something went wrong. Please try again.${code ? ` (code: ${code})` : ""}`;
}
