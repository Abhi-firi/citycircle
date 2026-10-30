import { getSupabase } from "@/lib/supabase/client";
import type { ConnectionRow } from "./logic";

export type Person = {
  id: string;
  name: string;
  headline: string;
  citySlug: string;
  avatarPath: string | null;
};

export type Suggestion = Person & { sharedCommunities: number };

export type MemberProfile = Person & {
  roleTitle: string;
  company: string;
  gender: string;
  about: string;
  skills: string[];
  domainSlugs: string[];
  experienceYears: number | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  headline: string | null;
  city_slug: string | null;
  avatar_path: string | null;
};

const toPerson = (r: ProfileRow): Person => ({
  id: r.id,
  name: r.full_name,
  headline: r.headline ?? "",
  citySlug: r.city_slug ?? "",
  avatarPath: r.avatar_path ?? null,
});

export async function fetchConnectionRows(): Promise<ConnectionRow[]> {
  const { data, error } = await getSupabase()
    .from("connections")
    .select("id, requester_id, addressee_id, status")
    .limit(500);
  if (error) throw error;
  return (
    (data ?? []) as {
      id: string;
      requester_id: string;
      addressee_id: string;
      status: "pending" | "accepted";
    }[]
  ).map((r) => ({
    id: r.id,
    requesterId: r.requester_id,
    addresseeId: r.addressee_id,
    status: r.status,
  }));
}

export async function fetchPeople(
  ids: string[],
): Promise<Record<string, Person>> {
  if (ids.length === 0) return {};
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, full_name, headline, city_slug, avatar_path")
    .in("id", ids);
  if (error) throw error;
  const out: Record<string, Person> = {};
  for (const r of (data ?? []) as ProfileRow[]) out[r.id] = toPerson(r);
  return out;
}

export async function fetchSuggestions(limit = 10): Promise<Suggestion[]> {
  const { data, error } = await getSupabase().rpc("suggested_people", {
    p_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as (ProfileRow & { shared_communities: number })[]).map(
    (r) => ({
      ...toPerson(r),
      sharedCommunities: r.shared_communities,
    }),
  );
}

export async function fetchMemberProfile(
  id: string,
): Promise<MemberProfile | null> {
  const db = getSupabase();
  const [profile, details] = await Promise.all([
    db
      .from("profiles")
      .select(
        "id, full_name, gender, headline, city_slug, avatar_path, about, skills, domain_slugs, current_role_title, current_company",
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("profile_details")
      .select("experience_years")
      .eq("user_id", id)
      .maybeSingle(),
  ]);
  if (profile.error) throw profile.error;
  const r = profile.data as
    | (ProfileRow & {
        about: string | null;
        skills: string[] | null;
        domain_slugs: string[] | null;
        current_role_title: string | null;
        current_company: string | null;
        gender: string | null;
      })
    | null;
  if (!r) return null;
  return {
    ...toPerson(r),
    roleTitle: r.current_role_title ?? "",
    company: r.current_company ?? "",
    gender: r.gender ?? "",
    about: r.about ?? "",
    skills: r.skills ?? [],
    domainSlugs: r.domain_slugs ?? [],
    experienceYears: details.data?.experience_years ?? null,
  };
}

export async function sendRequest(me: string, other: string): Promise<void> {
  const { error } = await getSupabase()
    .from("connections")
    .insert({ requester_id: me, addressee_id: other });
  // 23505 = already requested or connected: treat as done.
  if (error && error.code !== "23505") throw error;
}

export async function acceptRequest(connectionId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("connections")
    .update({ status: "accepted" })
    .eq("id", connectionId);
  if (error) throw error;
}

/** Cancel a sent request, decline a received one, or remove a connection. */
export async function removeConnection(connectionId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("connections")
    .delete()
    .eq("id", connectionId);
  if (error) throw error;
}

export function networkErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code;
  if (code === "23514")
    return "You have sent too many requests today. Please try again tomorrow.";
  return `Something went wrong. Please try again.${code ? ` (code: ${code})` : ""}`;
}

export async function searchPeople(
  pattern: string,
  limit = 5,
): Promise<Person[]> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id, full_name, headline, city_slug, avatar_path")
    .ilike("full_name", pattern)
    .order("full_name")
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(toPerson);
}
