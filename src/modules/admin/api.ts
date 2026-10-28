import { getSupabase } from "@/lib/supabase/client";
import { communityKey } from "@/modules/memberships/progress";

export type CommunityStatus = "waitlist" | "live";

export async function fetchIsAdmin(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("is_admin");
  if (error) throw error;
  return data === true;
}

/** Statuses by "city/domain". Communities with no row are still on the waitlist. */
export async function fetchStatuses(): Promise<Record<string, CommunityStatus>> {
  const { data, error } = await getSupabase().from("community_status").select("city_slug, domain_slug, status");
  if (error) throw error;
  const out: Record<string, CommunityStatus> = {};
  for (const r of (data ?? []) as { city_slug: string; domain_slug: string; status: CommunityStatus }[]) {
    out[communityKey(r.city_slug, r.domain_slug)] = r.status;
  }
  return out;
}

export async function setStatus(
  adminId: string,
  citySlug: string,
  domainSlug: string,
  status: CommunityStatus,
): Promise<void> {
  const { error } = await getSupabase()
    .from("community_status")
    .upsert({ city_slug: citySlug, domain_slug: domainSlug, status, updated_by: adminId });
  if (error) throw error;
}
