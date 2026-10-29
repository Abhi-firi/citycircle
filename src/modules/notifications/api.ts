import { getSupabase } from "@/lib/supabase/client";
import { fetchPeople } from "@/modules/network/api";
import type { AppNotification, NotificationType } from "./text";

type Row = {
  id: string;
  type: NotificationType;
  actor_id: string | null;
  city_slug: string | null;
  domain_slug: string | null;
  created_at: string;
  read_at: string | null;
};

export async function fetchNotifications(
  limit = 50,
): Promise<AppNotification[]> {
  const { data, error } = await getSupabase()
    .from("notifications")
    .select("id, type, actor_id, city_slug, domain_slug, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    type: r.type,
    actorId: r.actor_id,
    citySlug: r.city_slug ?? "",
    domainSlug: r.domain_slug ?? "",
    createdAt: r.created_at,
    read: r.read_at !== null,
  }));
}

/** Number of unread notifications, without loading them. */
export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllRead(): Promise<void> {
  const { error } = await getSupabase()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw error;
}

export async function markRead(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function actorNames(
  list: AppNotification[],
): Promise<Record<string, string>> {
  const ids = [...new Set(list.flatMap((n) => (n.actorId ? [n.actorId] : [])))];
  const people = await fetchPeople(ids);
  return Object.fromEntries(Object.values(people).map((p) => [p.id, p.name]));
}
