import { describe, expect, it } from "vitest";
import { parseSkills, validateProfile, type ProfileInput } from "./validation";

const cities = ["delhi", "bangalore"];
const domains = ["vc", "coders"];

const valid: ProfileInput = {
  fullName: "Asha Rao",
  headline: "Product Manager",
  about: "",
  citySlug: "bangalore",
  domainSlugs: ["coders"],
  roleTitle: "PM",
  company: "Acme",
  experienceYears: "5",
  skillsText: "SQL, Figma",
  linkedinUrl: "https://linkedin.com/in/asha",
  websiteUrl: "",
  openToWork: false,
  noticePeriodDays: "",
  ctcMin: "",
  ctcMax: "",
};

describe("parseSkills", () => {
  it("splits, trims, removes empties and duplicates", () => {
    expect(parseSkills(" SQL, sql ,, Figma ,")).toEqual(["SQL", "Figma"]);
  });
});

describe("validateProfile", () => {
  it("accepts a valid profile", () => {
    expect(validateProfile(valid, cities, domains)).toEqual({});
  });

  it("requires name, city and at least one domain", () => {
    const errors = validateProfile({ ...valid, fullName: " ", citySlug: "", domainSlugs: [] }, cities, domains);
    expect(errors.fullName).toBeDefined();
    expect(errors.citySlug).toBeDefined();
    expect(errors.domainSlugs).toBeDefined();
  });

  it("rejects unknown city and domain values", () => {
    const errors = validateProfile({ ...valid, citySlug: "atlantis", domainSlugs: ["nope"] }, cities, domains);
    expect(errors.citySlug).toBeDefined();
    expect(errors.domainSlugs).toBeDefined();
  });

  it("limits experience to whole years from 0 to 60", () => {
    expect(validateProfile({ ...valid, experienceYears: "61" }, cities, domains).experienceYears).toBeDefined();
    expect(validateProfile({ ...valid, experienceYears: "2.5" }, cities, domains).experienceYears).toBeDefined();
    expect(validateProfile({ ...valid, experienceYears: "0" }, cities, domains).experienceYears).toBeUndefined();
  });

  it("requires https links", () => {
    expect(validateProfile({ ...valid, websiteUrl: "http://x.com" }, cities, domains).websiteUrl).toBeDefined();
    expect(validateProfile({ ...valid, linkedinUrl: "javascript:alert(1)" }, cities, domains).linkedinUrl).toBeDefined();
  });

  it("limits skills to 30", () => {
    const many = Array.from({ length: 31 }, (_, i) => `s${i}`).join(",");
    expect(validateProfile({ ...valid, skillsText: many }, cities, domains).skillsText).toBeDefined();
  });

  it("checks notice period and CTC range", () => {
    expect(validateProfile({ ...valid, noticePeriodDays: "45" }, cities, domains).noticePeriodDays).toBeDefined();
    expect(validateProfile({ ...valid, noticePeriodDays: "30" }, cities, domains).noticePeriodDays).toBeUndefined();
    expect(validateProfile({ ...valid, ctcMin: "25", ctcMax: "20" }, cities, domains).ctcMax).toBeDefined();
    expect(validateProfile({ ...valid, ctcMin: "20", ctcMax: "25" }, cities, domains)).toEqual({});
  });
});
