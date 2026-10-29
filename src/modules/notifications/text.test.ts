import { describe, expect, it } from "vitest";
import {
  describeNotification,
  unreadCount,
  type AppNotification,
} from "./text";

const base: AppNotification = {
  id: "1",
  type: "comment",
  actorId: "u1",
  citySlug: "pune",
  domainSlug: "coders",
  createdAt: "2026-10-29T00:00:00Z",
  read: false,
};

describe("describeNotification", () => {
  it("links a comment to its community", () => {
    const d = describeNotification(base, "Priya", "Coders Pune");
    expect(d.text).toContain("Priya commented");
    expect(d.href).toBe("/cities/pune/coders/");
  });
  it("links an accepted request to the member", () => {
    const d = describeNotification(
      { ...base, type: "connection_accepted" },
      "Rohit",
      "",
    );
    expect(d.href).toBe("/members/?id=u1");
  });
  it("handles requests and live communities", () => {
    expect(
      describeNotification({ ...base, type: "connection_request" }, "A", "")
        .href,
    ).toBe("/network/");
    expect(
      describeNotification(
        { ...base, type: "community_live" },
        "",
        "Coders Pune",
      ).text,
    ).toContain("Coders Pune");
  });
  it("falls back when the actor is unknown", () => {
    expect(
      describeNotification({ ...base, type: "connection_request" }, "", "")
        .text,
    ).toMatch(/^Someone/);
  });
});

describe("unreadCount", () => {
  it("counts unread only", () => {
    expect(unreadCount([base, { ...base, id: "2", read: true }])).toBe(1);
  });
});
