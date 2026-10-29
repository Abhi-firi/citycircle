"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { Card } from "@/components/Card";
import { inputClass } from "@/modules/auth/Field";
import { memberHref, PersonAvatar } from "@/modules/network/PersonRow";
import { timeAgo } from "@/modules/posts/text";
import {
  fetchConversations,
  fetchMessages,
  markRead,
  messageErrorMessage,
  sendMessage,
} from "./api";
import {
  MAX_MESSAGE,
  mergeMessages,
  previewText,
  unreadIncomingIds,
  validateMessage,
  type ChatMessage,
  type ConversationSummary,
} from "./logic";

const LIST_REFRESH_MS = 30000;
const THREAD_REFRESH_MS = 5000;

export function MessagesView({
  userId,
  activeId,
}: {
  userId: string;
  activeId: string | null;
}) {
  const [list, setList] = useState<ConversationSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    fetchConversations().then(
      (rows) => {
        if (!active) return;
        setList(rows);
        setFailed(false);
      },
      (err) => {
        console.error("Could not load conversations", err);
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [tick, activeId]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setTick((n) => n + 1),
      LIST_REFRESH_MS,
    );
    return () => window.clearInterval(timer);
  }, []);

  if (failed)
    return (
      <p className="text-muted">
        Could not load your messages. Please refresh the page.
      </p>
    );
  if (list === null) return <p className="text-muted">Loading...</p>;

  const active = list.find((c) => c.id === activeId) ?? null;

  return (
    <div className="grid gap-4 md:grid-cols-[20rem_minmax(0,1fr)]">
      <div className={active ? "hidden md:block" : ""}>
        <ConversationList list={list} activeId={activeId} />
      </div>
      <div className={active ? "" : "hidden md:block"}>
        {active ? (
          <Thread
            key={active.id}
            userId={userId}
            conversation={active}
            onSent={() => setTick((n) => n + 1)}
          />
        ) : (
          <Card className="flex h-80 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted">
            <MessageSquare
              aria-hidden="true"
              className="h-6 w-6 text-primary"
            />
            Pick a conversation, or open a connection&apos;s profile and tap
            Message.
          </Card>
        )}
      </div>
    </div>
  );
}

function ConversationList({
  list,
  activeId,
}: {
  list: ConversationSummary[];
  activeId: string | null;
}) {
  return (
    <Card className="overflow-hidden">
      {list.length === 0 ? (
        <div className="space-y-2 p-6 text-center text-sm text-muted">
          <p>No conversations yet.</p>
          <p>
            You can message people you are{" "}
            <Link
              href="/network/"
              className="font-medium text-primary underline"
            >
              connected
            </Link>{" "}
            with.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {list.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/?c=${encodeURIComponent(c.id)}`}
                aria-current={c.id === activeId ? "true" : undefined}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-pale ${c.id === activeId ? "bg-mint" : ""}`}
              >
                <PersonAvatar name={c.otherName} path={c.otherAvatar} />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate ${c.unread > 0 ? "font-semibold" : "font-medium"}`}
                    >
                      {c.otherName}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {c.lastBody ? timeAgo(c.lastAt) : ""}
                    </span>
                  </span>
                  <span
                    className={`block truncate ${c.unread > 0 ? "text-fg" : "text-muted"}`}
                  >
                    {c.lastBody ? previewText(c.lastBody) : "Say hello"}
                  </span>
                </span>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-on-primary">
                    {c.unread > 9 ? "9+" : c.unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Thread({
  userId,
  conversation,
  onSent,
}: {
  userId: string;
  conversation: ConversationSummary;
  onSent: () => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetchMessages(conversation.id).then(
        (rows) => {
          if (!active) return;
          setMessages((current) => mergeMessages(current, rows));
          setFailed(false);
          setLoaded(true);
          const unread = unreadIncomingIds(rows, userId);
          if (unread.length > 0)
            markRead(unread).catch((err) =>
              console.error("Could not mark read", err),
            );
        },
        (err) => {
          console.error("Could not load messages", err);
          if (active) {
            setFailed(true);
            setLoaded(true);
          }
        },
      );
    void load();
    const timer = window.setInterval(load, THREAD_REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [conversation.id, userId, refresh]);

  const count = messages.length;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [count]);

  const send = useCallback(async () => {
    const problem = validateMessage(text);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await sendMessage(userId, conversation.id, text);
      setText("");
      setRefresh((n) => n + 1);
      onSent();
    } catch (err) {
      console.error("Send failed", err);
      setError(messageErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [text, userId, conversation.id, onSent]);

  return (
    <Card className="flex h-[70vh] min-h-96 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={() => router.push("/messages/")}
          aria-label="Back to conversations"
          className="text-muted hover:text-fg md:hidden"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <PersonAvatar
          name={conversation.otherName}
          path={conversation.otherAvatar}
        />
        <div className="min-w-0">
          <Link
            href={memberHref(conversation.otherId)}
            className="block truncate font-medium hover:text-primary hover:underline"
          >
            {conversation.otherName}
          </Link>
          {conversation.otherHeadline && (
            <p className="truncate text-xs text-muted">
              {conversation.otherHeadline}
            </p>
          )}
        </div>
      </header>

      <div
        className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {failed && messages.length === 0 ? (
          <p className="text-sm text-muted">
            Could not load this conversation. It refreshes automatically.
          </p>
        ) : !loaded ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No messages yet. Say hello to {conversation.otherName}.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === userId;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    mine
                      ? "rounded-br-sm bg-primary text-on-primary"
                      : "rounded-bl-sm bg-pale"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={`mt-1 text-[11px] ${mine ? "text-mint" : "text-muted"}`}
                  >
                    {timeAgo(m.createdAt)}
                    {mine && m.read ? " · Seen" : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="space-y-2 border-t border-line p-3"
        noValidate
      >
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            rows={1}
            maxLength={MAX_MESSAGE}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder="Write a message..."
            className={`${inputClass} max-h-32 resize-none rounded-xl`}
          />
          <button
            type="submit"
            disabled={busy}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary hover:opacity-90 disabled:opacity-60"
          >
            <Send aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </form>
    </Card>
  );
}
