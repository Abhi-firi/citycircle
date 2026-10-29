import { describe, expect, it } from "vitest";
import {
  centerSquare,
  extensionFor,
  fitWithin,
  validateImageFile,
} from "./image";

describe("fitWithin", () => {
  it("scales the longest side down, keeping the ratio", () => {
    expect(fitWithin(4000, 2000, 1000)).toEqual({ width: 1000, height: 500 });
    expect(fitWithin(1000, 3000, 1500)).toEqual({ width: 500, height: 1500 });
  });
  it("never scales up", () => {
    expect(fitWithin(300, 200, 1000)).toEqual({ width: 300, height: 200 });
  });
});

describe("centerSquare", () => {
  it("crops the longer side evenly", () => {
    expect(centerSquare(400, 200)).toEqual({ sx: 100, sy: 0, side: 200 });
    expect(centerSquare(200, 500)).toEqual({ sx: 0, sy: 150, side: 200 });
  });
});

describe("validateImageFile", () => {
  it("accepts common types and rejects others", () => {
    expect(validateImageFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(
      validateImageFile({ type: "application/pdf", size: 1000 }),
    ).not.toBeNull();
    expect(
      validateImageFile({ type: "image/jpeg", size: 20 * 1024 * 1024 }),
    ).not.toBeNull();
  });
});

describe("extensionFor", () => {
  it("maps mime types", () => {
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
  });
});
