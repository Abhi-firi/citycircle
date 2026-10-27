import { getSupabase } from "@/lib/supabase/client";
import { communityKey } from "./progress";

/** Member counts for every community, keyed "city/domain". Works for logged-out visitors too. */
export async function fetchMemberCounts(): Promise<Record<string, number>> {
  const { data, error } = await getSupabase().rpc("community_member_counts");
  if (error) throw error;
  const rows = (data ?? []) as { city_slug: string; domain_slug: string; member_count: number | string }[];
  const counts: Record<string, number> = {};
  for (const row of rows) counts[communityKey(row.city_slug, row.domain_slug)] = Number(row.member_count);
  return counts;
}

/** Keys ("city/domain") of the communities the member has joined. */
export async function fetchMyMemberships(userId: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from("community_memberships")
    .select("city_slug, domain_slug")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r: { city_slug: string; domain_slug: string }) =>
    communityKey(r.city_slug, r.domain_slug),
  );
}

export async function joinCommunity(userId: string, citySlug: string, domainSlug: string): Promise<void> {
  const { error } = await getSupabase()
    .from("community_memberships")
    .insert({ user_id: userId, city_slug: citySlug, domain_slug: domainSlug });
  // 23505 = already a member: treat as success.
  if (error && error.code !== "23505") throw error;
}

export async function leaveCommunity(userId: string, citySlug: string, domainSlug: string): Promise<void> {
  const { error } = await getSupabase()
    .from("community_memberships")
    .delete()
    .match({ user_id: userId, city_slug: citySlug, domain_slug: domainSlug });
  if (error) throw error;
}
