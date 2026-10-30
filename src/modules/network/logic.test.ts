import { describe, expect, it } from "vitest";
import {
  groupConnections,
  otherPartyId,
  relationshipWith,
  toNamePattern,
  type ConnectionRow,
} from "./logic";

const rows: ConnectionRow[] = [
  { id: "1", requesterId: "me", addresseeId: "a", status: "pending" },
  { id: "2", requesterId: "b", addresseeId: "me", status: "pending" },
  { id: "3", requesterId: "c", addresseeId: "me", status: "accepted" },
];

describe("relationshipWith", () => {
  it("reports each state", () => {
    expect(relationshipWith(rows, "me", "a")).toEqual({
      state: "sent",
      connectionId: "1",
    });
    expect(relationshipWith(rows, "me", "b")).toEqual({
      state: "received",
      connectionId: "2",
    });
    expect(relationshipWith(rows, "me", "c")).toEqual({
      state: "connected",
      connectionId: "3",
    });
    expect(relationshipWith(rows, "me", "z")).toEqual({ state: "none" });
  });
});

describe("groupConnections", () => {
  it("splits incoming, sent and connected", () => {
    const g = groupConnections(rows, "me");
    expect(g.incoming.map((r) => r.id)).toEqual(["2"]);
    expect(g.sent.map((r) => r.id)).toEqual(["1"]);
    expect(g.connected.map((r) => r.id)).toEqual(["3"]);
  });
});

describe("otherPartyId", () => {
  it("returns the other side", () => {
    expect(otherPartyId(rows[0]!, "me")).toBe("a");
    expect(otherPartyId(rows[1]!, "me")).toBe("b");
  });
});

describe("toNamePattern", () => {
  it("ignores short input", () => {
    expect(toNamePattern(" a ")).toBeNull();
  });
  it("wraps and trims", () => {
    expect(toNamePattern("  Asha   Rao ")).toBe("%Asha Rao%");
  });
  it("escapes LIKE wildcards", () => {
    expect(toNamePattern("a%b_c")).toBe("%a\\%b\\_c%");
  });
});
