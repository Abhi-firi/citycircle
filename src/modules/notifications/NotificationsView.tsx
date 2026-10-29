"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Card } from "@/components/Card";
import { communityRepository as repo } from "@/modules/communities/repository";
import { timeAgo } from "@/modules/posts/text";
import { actorNames, fetchNotifications, markAllRead, markRead } from "./api";
import {
  describeNotification,
  unreadCount,
  type AppNotification,
} from "./text";

export function NotificationsView() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await fetchNotifications();
        const found = await actorNames(list).catch(() => ({}));
        if (!active) return;
        setItems(list);
        setNames(found);
        setState("ready");
      } catch (err) {
        console.error("Could not load notifications", err);
        if (active) setState("failed");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") return <p className="text-muted">Loading...</p>;
  if (state === "failed")
    return (
      <p className="text-muted">
        Could not load notifications. Please refresh the page.
      </p>
    );

  const unread = unreadCount(items);

  async function readAll() {
    try {
      await markAllRead();
      setItems((list) => list.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Could not mark as read", err);
    }
  }

  function open(n: AppNotification) {
    if (n.read) return;
    setItems((list) =>
      list.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
    );
    markRead(n.id).catch((err) => console.error("Could not mark as read", err));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {unread > 0 ? `${unread} unread` : "You are all caught up."}
        </p>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => void readAll()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>
      <Card className="divide-y divide-line">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted">
            <Bell aria-hidden="true" className="h-6 w-6 text-primary" />
            Nothing yet. Connection requests, comments and community updates
            will show up here.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => {
              const community =
                repo.getCommunity(n.citySlug, n.domainSlug)?.name ??
                "your community";
              const { text, href } = describeNotification(
                n,
                n.actorId ? (names[n.actorId] ?? "") : "",
                community,
              );
              return (
                <li key={n.id}>
                  <Link
                    href={href}
                    onClick={() => open(n)}
                    className={`flex items-start gap-3 px-5 py-4 hover:bg-pale ${n.read ? "" : "bg-pale/60"}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`}
                    />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className={n.read ? "" : "font-medium"}>
                        {text}
                      </span>
                      <span className="block text-xs text-muted">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                    {!n.read && <span className="sr-only">Unread</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
