export const MAX_MESSAGE = 2000;

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type ConversationSummary = {
  id: string;
  otherId: string;
  otherName: string;
  otherHeadline: string;
  otherAvatar: string | null;
  lastBody: string;
  lastAt: string;
  unread: number;
};

/** Returns an error message, or null when the message can be sent. */
export function validateMessage(text: string): string | null {
  const t = text.trim();
  if (t.length === 0) return "Write a message first.";
  if (t.length > MAX_MESSAGE)
    return `Keep messages under ${MAX_MESSAGE} characters.`;
  return null;
}

/** Merge freshly fetched messages into the list we already show, oldest first, no duplicates. */
export function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of current) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) =>
    a.createdAt === b.createdAt
      ? a.id.localeCompare(b.id)
      : a.createdAt.localeCompare(b.createdAt),
  );
}

/** Ids of messages from the other person that we have not marked as read yet. */
export function unreadIncomingIds(
  messages: ChatMessage[],
  me: string,
): string[] {
  return messages.filter((m) => m.senderId !== me && !m.read).map((m) => m.id);
}

export function previewText(body: string, max = 60): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
