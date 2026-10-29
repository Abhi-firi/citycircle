import { describe, expect, it } from "vitest";
import { reasonLabel, validateReport } from "./reasons";

describe("validateReport", () => {
  it("requires a known reason", () => {
    expect(validateReport("", "")).not.toBeNull();
    expect(validateReport("banana", "")).not.toBeNull();
    expect(validateReport("spam", "")).toBeNull();
  });
  it("limits details", () => {
    expect(validateReport("spam", "x".repeat(501))).not.toBeNull();
    expect(validateReport("spam", "x".repeat(500))).toBeNull();
  });
});

describe("reasonLabel", () => {
  it("labels known reasons and passes others through", () => {
    expect(reasonLabel("scam")).toBe("Scam or fake offer");
    expect(reasonLabel("zzz")).toBe("zzz");
  });
});
