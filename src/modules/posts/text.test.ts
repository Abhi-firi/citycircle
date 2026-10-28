import { describe, expect, it } from "vitest";
import { timeAgo, validateBody } from "./text";

describe("validateBody", () => {
  it("rejects blank and over-long text", () => {
    expect(validateBody("   ", 10)).not.toBeNull();
    expect(validateBody("x".repeat(11), 10)).not.toBeNull();
  });
  it("accepts normal text, ignoring surrounding spaces", () => {
    expect(validateBody("  hello  ", 5)).toBeNull();
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-28T12:00:00Z");
  it("formats recent times", () => {
    expect(timeAgo("2026-10-28T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-10-28T11:55:00Z", now)).toBe("5m");
    expect(timeAgo("2026-10-28T09:00:00Z", now)).toBe("3h");
    expect(timeAgo("2026-10-26T12:00:00Z", now)).toBe("2d");
  });
  it("falls back to a date after a week", () => {
    expect(timeAgo("2026-09-01T12:00:00Z", now)).toMatch(/2026/);
  });
});
