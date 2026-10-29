import { describe, expect, it } from "vitest";
import { createStaticRepository } from "./repository";

const repo = createStaticRepository();

describe("static community repository", () => {
  it("covers the 8 launch cities", () => {
    const slugs = repo.listCities().map((c) => c.slug);
    expect(slugs).toEqual([
      "delhi",
      "noida",
      "gurugram",
      "mumbai",
      "pune",
      "bangalore",
      "hyderabad",
      "chennai",
    ]);
  });

  it("has unique city and domain slugs", () => {
    const cities = repo.listCities().map((c) => c.slug);
    const domains = repo.listDomains().map((d) => d.slug);
    expect(new Set(cities).size).toBe(cities.length);
    expect(new Set(domains).size).toBe(domains.length);
  });

  it("creates one community per city and domain with unique ids", () => {
    const all = repo
      .listCities()
      .flatMap((c) => repo.listCommunitiesByCity(c.slug));
    expect(all).toHaveLength(
      repo.listCities().length * repo.listDomains().length,
    );
    expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
  });

  it("names communities as '<domain> <city>'", () => {
    const community = repo.getCommunity("bangalore", "angel-investors");
    expect(community?.name).toBe("Angel Investors Bangalore");
  });

  it("starts every community on the waitlist with a positive unlock target", () => {
    const all = repo
      .listCities()
      .flatMap((c) => repo.listCommunitiesByCity(c.slug));
    for (const community of all) {
      expect(community.status).toBe("waitlist");
      expect(community.unlockTarget).toBeGreaterThan(0);
    }
  });

  it("returns undefined for unknown slugs", () => {
    expect(repo.getCity("atlantis")).toBeUndefined();
    expect(repo.getDomain("nope")).toBeUndefined();
    expect(repo.getCommunity("pune", "nope")).toBeUndefined();
    expect(repo.listCommunitiesByCity("atlantis")).toEqual([]);
  });
});
