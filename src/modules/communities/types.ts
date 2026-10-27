export type City = {
  slug: string;
  name: string;
  /** Short note shown on the city page, e.g. nearby areas. */
  blurb: string;
};

export type Domain = {
  slug: string;
  name: string;
  description: string;
};

export type CommunityStatus = "live" | "waitlist";

export type Community = {
  /** Unique, URL-safe id: `${citySlug}-${domainSlug}`. */
  id: string;
  citySlug: string;
  domainSlug: string;
  /** Display name, e.g. "Angel Investors Bangalore". */
  name: string;
  status: CommunityStatus;
  /** Waitlist size needed before the community goes live. */
  unlockTarget: number;
};

/**
 * Data access boundary. The static implementation can later be replaced by a
 * Supabase-backed one without touching pages.
 */
export interface CommunityRepository {
  listCities(): City[];
  getCity(slug: string): City | undefined;
  listDomains(): Domain[];
  getDomain(slug: string): Domain | undefined;
  listCommunitiesByCity(citySlug: string): Community[];
  getCommunity(citySlug: string, domainSlug: string): Community | undefined;
}
