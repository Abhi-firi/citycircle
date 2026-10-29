import { describe, expect, it } from "vitest";
import {
  EMPTY_EXTRAS,
  completionPercent,
  completionSteps,
  parseNumber,
  parseSkills,
  validateAbout,
  validatePreferences,
  validateWork,
} from "./extras";

describe("completion", () => {
  it("starts at 25% (basic details done)", () => {
    expect(completionPercent(EMPTY_EXTRAS)).toBe(25);
  });
  it("reaches 100% when all steps are done", () => {
    const full = {
      ...EMPTY_EXTRAS,
      about: "Hi",
      skills: ["Sales"],
      experienceYears: 3,
      prefsSaved: true,
    };
    expect(completionSteps(full).every((s) => s.done)).toBe(true);
    expect(completionPercent(full)).toBe(100);
  });
  it("work step needs both skills and experience", () => {
    const partial = { ...EMPTY_EXTRAS, skills: ["Sales"] };
    expect(completionSteps(partial).find((s) => s.id === "work")?.done).toBe(
      false,
    );
  });
});

describe("parseSkills", () => {
  it("splits, trims and de-duplicates", () => {
    expect(parseSkills("Sales, sales,  B2B  Sales\nPython,,")).toEqual([
      "Sales",
      "B2B Sales",
      "Python",
    ]);
  });
});

describe("validation", () => {
  it("limits about length", () => {
    expect(validateAbout("x".repeat(2001)).about).toBeDefined();
    expect(validateAbout("ok")).toEqual({});
  });
  it("checks skills and experience", () => {
    expect(validateWork(["a".repeat(41)], 1).skills).toBeDefined();
    expect(validateWork(["ok"], 61).experienceYears).toBeDefined();
    expect(validateWork(["ok"], 2.5).experienceYears).toBeDefined();
    expect(validateWork(["ok"], null)).toEqual({});
  });
  it("checks pay range and notice period", () => {
    expect(validatePreferences(30, 10, 5).ctc).toBeDefined();
    expect(validatePreferences(45, null, null).ctc).toBeDefined();
    expect(validatePreferences(30, NaN, null).ctc).toBeDefined();
    expect(validatePreferences(30, 8, 12)).toEqual({});
  });
  it("parseNumber handles blanks and junk", () => {
    expect(parseNumber(" ")).toBeNull();
    expect(parseNumber("12.5")).toBe(12.5);
    expect(parseNumber("abc")).toBeNaN();
  });
});
