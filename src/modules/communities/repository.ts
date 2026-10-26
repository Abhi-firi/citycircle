import { CITIES, DOMAINS, UNLOCK_TARGET } from "./seed";
import type { Community, CommunityRepository } from "./types";

function buildCommunities(): Community[] {
  return CITIES.flatMap((city) =>
    DOMAINS.map((domain) => ({
      id: `${city.slug}-${domain.slug}`,
      citySlug: city.slug,
      domainSlug: domain.slug,
      name: `${domain.name} ${city.name}`,
      // Every community starts on the waitlist; the team switches it to live
      // once the unlock target is reached.
      status: "waitlist" as const,
      unlockTarget: UNLOCK_TARGET,
    })),
  );
}

export function createStaticRepository(): CommunityRepository {
  const communities = buildCommunities();

  return {
    listCities: () => CITIES,
    getCity: (slug) => CITIES.find((c) => c.slug === slug),
    listDomains: () => DOMAINS,
    getDomain: (slug) => DOMAINS.find((d) => d.slug === slug),
    listCommunitiesByCity: (citySlug) =>
      communities.filter((c) => c.citySlug === citySlug),
    getCommunity: (citySlug, domainSlug) =>
      communities.find((c) => c.citySlug === citySlug && c.domainSlug === domainSlug),
  };
}

export const communityRepository: CommunityRepository = createStaticRepository();
