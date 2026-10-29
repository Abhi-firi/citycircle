import { describe, expect, it } from "vitest";
import { communityKey, waitlistProgress } from "./progress";

describe("waitlistProgress", () => {
  it("starts at zero", () => {
    expect(waitlistProgress(0, 100)).toEqual({
      percent: 0,
      remaining: 100,
      reached: false,
    });
  });

  it("rounds the percentage down", () => {
    expect(waitlistProgress(1, 3).percent).toBe(33);
    expect(waitlistProgress(99, 100).percent).toBe(99);
  });

  it("reports reached at and above the target, capped at 100%", () => {
    expect(waitlistProgress(100, 100)).toEqual({
      percent: 100,
      remaining: 0,
      reached: true,
    });
    expect(waitlistProgress(250, 100)).toEqual({
      percent: 100,
      remaining: 0,
      reached: true,
    });
  });

  it("is safe with bad input", () => {
    expect(waitlistProgress(-5, 100).percent).toBe(0);
    expect(waitlistProgress(5, 0).percent).toBe(100);
  });
});

describe("communityKey", () => {
  it("joins city and domain", () => {
    expect(communityKey("delhi", "vc")).toBe("delhi/vc");
  });
});
