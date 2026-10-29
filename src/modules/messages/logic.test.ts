import { describe, expect, it } from "vitest";
import {
  mergeMessages,
  previewText,
  unreadIncomingIds,
  validateMessage,
  type ChatMessage,
} from "./logic";

const m = (
  id: string,
  sender: string,
  at: string,
  read = false,
): ChatMessage => ({
  id,
  senderId: sender,
  body: id,
  createdAt: at,
  read,
});

describe("validateMessage", () => {
  it("rejects blank and too long", () => {
    expect(validateMessage("  ")).not.toBeNull();
    expect(validateMessage("x".repeat(2001))).not.toBeNull();
    expect(validateMessage("hi")).toBeNull();
  });
});

describe("mergeMessages", () => {
  it("de-duplicates, sorts oldest first and takes the newer copy", () => {
    const merged = mergeMessages(
      [
        m("2", "a", "2026-01-01T00:00:02Z"),
        m("1", "a", "2026-01-01T00:00:01Z"),
      ],
      [
        m("2", "a", "2026-01-01T00:00:02Z", true),
        m("3", "b", "2026-01-01T00:00:03Z"),
      ],
    );
    expect(merged.map((x) => x.id)).toEqual(["1", "2", "3"]);
    expect(merged[1]?.read).toBe(true);
  });
});

describe("unreadIncomingIds", () => {
  it("lists only unread messages from the other person", () => {
    const list = [
      m("1", "me", "t1"),
      m("2", "them", "t2"),
      m("3", "them", "t3", true),
    ];
    expect(unreadIncomingIds(list, "me")).toEqual(["2"]);
  });
});

describe("previewText", () => {
  it("flattens whitespace and truncates", () => {
    expect(previewText("a\n\nb")).toBe("a b");
    expect(previewText("x".repeat(100), 10)).toHaveLength(10);
  });
});
