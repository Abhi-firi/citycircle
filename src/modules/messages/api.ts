import { getSupabase } from "@/lib/supabase/client";
import type { ChatMessage, ConversationSummary } from "./logic";

export async function startConversation(otherId: string): Promise<string> {
  const { data, error } = await getSupabase().rpc("start_conversation", {
    p_other: otherId,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await getSupabase().rpc("my_conversations");
  if (error) throw error;
  type Row = {
    conversation_id: string;
    other_id: string;
    other_name: string;
    other_headline: string | null;
    last_body: string | null;
    last_at: string;
    unread: number;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.conversation_id,
    otherId: r.other_id,
    otherName: r.other_name,
    otherHeadline: r.other_headline ?? "",
    lastBody: r.last_body ?? "",
    lastAt: r.last_at,
    unread: r.unread,
  }));
}

export async function fetchUnreadMessageCount(): Promise<number> {
  const { data, error } = await getSupabase().rpc("unread_message_count");
  if (error) throw error;
  return Number(data ?? 0);
}

const PAGE = 100;

/** Latest messages of a conversation, oldest first. */
export async function fetchMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await getSupabase()
    .from("messages")
    .select("id, sender_id, body, created_at, read_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(PAGE);
  if (error) throw error;
  type Row = {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
    read_at: string | null;
  };
  return ((data ?? []) as Row[])
    .map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      body: r.body,
      createdAt: r.created_at,
      read: r.read_at !== null,
    }))
    .reverse();
}

export async function sendMessage(
  me: string,
  conversationId: string,
  body: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: me,
      body: body.trim(),
    });
  if (error) throw error;
}

export async function markRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await getSupabase()
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw error;
}

export function messageErrorMessage(err: unknown): string {
  const code = (err as { code?: string }).code;
  if (code === "23514")
    return "You are sending messages too fast. Wait a moment.";
  if (code === "42501")
    return "You can only message people you are connected with.";
  return `Could not send. Please try again.${code ? ` (code: ${code})` : ""}`;
}
