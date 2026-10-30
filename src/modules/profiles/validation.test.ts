import { describe, expect, it } from "vitest";
import {
  isProfileComplete,
  pronounsFor,
  validateProfile,
  type ProfileInput,
} from "./validation";

const cities = ["delhi", "bangalore"];
const domains = ["vc", "coders"];

const valid: ProfileInput = {
  fullName: "Asha Rao",
  headline: "Product Manager",
  citySlug: "bangalore",
  domainSlugs: ["coders"],
  gender: "female",
  roleTitle: "PM",
  company: "Acme",
};

describe("validateProfile", () => {
  it("accepts a valid profile", () => {
    expect(validateProfile(valid, cities, domains)).toEqual({});
  });

  it("accepts a profile with only the required fields", () => {
    const minimal = { ...valid, headline: "", roleTitle: "", company: "" };
    expect(validateProfile(minimal, cities, domains)).toEqual({});
  });

  it("requires name, city and at least one domain", () => {
    const errors = validateProfile(
      { ...valid, fullName: " ", citySlug: "", domainSlugs: [] },
      cities,
      domains,
    );
    expect(errors.fullName).toBeDefined();
    expect(errors.citySlug).toBeDefined();
    expect(errors.domainSlugs).toBeDefined();
  });

  it("rejects unknown city and domain values", () => {
    const errors = validateProfile(
      { ...valid, citySlug: "atlantis", domainSlugs: ["nope"] },
      cities,
      domains,
    );
    expect(errors.citySlug).toBeDefined();
    expect(errors.domainSlugs).toBeDefined();
  });

  it("enforces length limits", () => {
    expect(
      validateProfile({ ...valid, fullName: "a".repeat(101) }, cities, domains)
        .fullName,
    ).toBeDefined();
    expect(
      validateProfile({ ...valid, headline: "a".repeat(161) }, cities, domains)
        .headline,
    ).toBeDefined();
    expect(
      validateProfile({ ...valid, roleTitle: "a".repeat(101) }, cities, domains)
        .roleTitle,
    ).toBeDefined();
    expect(
      validateProfile({ ...valid, company: "a".repeat(101) }, cities, domains)
        .company,
    ).toBeDefined();
  });
});

describe("isProfileComplete", () => {
  it("is true with name, city and a domain", () => {
    expect(isProfileComplete(valid)).toBe(true);
  });

  it("is false when city or domains are missing", () => {
    expect(isProfileComplete({ ...valid, citySlug: "" })).toBe(false);
    expect(isProfileComplete({ ...valid, domainSlugs: [] })).toBe(false);
    expect(isProfileComplete({ ...valid, gender: "" })).toBe(false);
  });

  it("requires gender", () => {
    expect(
      validateProfile({ ...valid, gender: "" }, cities, domains).gender,
    ).toBeDefined();
  });

  it("maps gender to pronouns", () => {
    expect(pronounsFor("male")).toBe("He/Him");
    expect(pronounsFor("female")).toBe("She/Her");
    expect(pronounsFor("other")).toBe("They/Them");
    expect(pronounsFor("")).toBe("");
  });

  it("accepts a known gender and rejects others", () => {
    expect(
      validateProfile({ ...valid, gender: "female" }, cities, domains),
    ).toEqual({});
    expect(
      validateProfile({ ...valid, gender: "x" }, cities, domains).gender,
    ).toBeDefined();
  });
});
