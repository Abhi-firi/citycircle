"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/Card";
import {
  fetchConnectionRows,
  fetchPeople,
  fetchSuggestions,
  type Person,
  type Suggestion,
} from "./api";
import { ConnectButton } from "./ConnectButton";
import {
  groupConnections,
  otherPartyId,
  relationshipWith,
  type ConnectionRow,
} from "./logic";
import { PersonRow } from "./PersonRow";

type Tab = "invitations" | "connections" | "sent" | "discover";

export function NetworkView({ userId }: { userId: string }) {
  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [tab, setTab] = useState<Tab | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const connectionRows = await fetchConnectionRows();
        const ids = [
          ...new Set(connectionRows.map((r) => otherPartyId(r, userId))),
        ];
        const [found, suggested] = await Promise.all([
          fetchPeople(ids),
          fetchSuggestions(20).catch(() => []),
        ]);
        if (!active) return;
        setRows(connectionRows);
        setPeople(found);
        setSuggestions(suggested);
        setFailed(false);
      } catch (err) {
        console.error("Could not load your network", err);
        if (active) setFailed(true);
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, reload]);

  const grouped = useMemo(() => groupConnections(rows, userId), [rows, userId]);

  if (failed)
    return (
      <p className="text-muted">
        Could not load your network. Please refresh the page.
      </p>
    );
  if (!loaded) return <p className="text-muted">Loading your network...</p>;

  // Open on invitations when there are any, otherwise on discovery.
  const current: Tab =
    tab ?? (grouped.incoming.length > 0 ? "invitations" : "discover");
  const refresh = () => setReload((n) => n + 1);

  const tabs: { key: Tab; label: string; count: number }[] = [
    {
      key: "invitations",
      label: "Invitations",
      count: grouped.incoming.length,
    },
    {
      key: "connections",
      label: "Connections",
      count: grouped.connected.length,
    },
    { key: "sent", label: "Sent", count: grouped.sent.length },
    {
      key: "discover",
      label: "People you may know",
      count: suggestions.length,
    },
  ];

  const rowsFor = (list: ConnectionRow[]) =>
    list.flatMap((r) => {
      const other = otherPartyId(r, userId);
      const person = people[other];
      return person ? [{ r, person }] : [];
    });

  const list = (
    items: { r: ConnectionRow; person: Person }[],
    empty: string,
  ) =>
    items.length === 0 ? (
      <p className="py-6 text-center text-sm text-muted">{empty}</p>
    ) : (
      <ul className="divide-y divide-line">
        {items.map(({ r, person }) => (
          <PersonRow
            key={r.id}
            person={person}
            action={
              <ConnectButton
                me={userId}
                other={person.id}
                relationship={relationshipWith(rows, userId, person.id)}
                onChange={refresh}
              />
            }
          />
        ))}
      </ul>
    );

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Network"
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={current === t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${
              current === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-xs">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card className="px-5 py-2">
        {current === "invitations" &&
          list(rowsFor(grouped.incoming), "No invitations right now.")}
        {current === "connections" &&
          list(
            rowsFor(grouped.connected),
            "You have no connections yet. Find people in the next tab.",
          )}
        {current === "sent" &&
          list(rowsFor(grouped.sent), "No pending requests sent.")}
        {current === "discover" &&
          (suggestions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No suggestions yet. Join a community or set your city to meet
              people near you.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {suggestions.map((s) => (
                <PersonRow
                  key={s.id}
                  person={s}
                  note={
                    s.sharedCommunities > 0
                      ? `${s.sharedCommunities} shared ${s.sharedCommunities === 1 ? "community" : "communities"}`
                      : undefined
                  }
                  action={
                    <ConnectButton
                      me={userId}
                      other={s.id}
                      relationship={relationshipWith(rows, userId, s.id)}
                      onChange={refresh}
                    />
                  }
                />
              ))}
            </ul>
          ))}
      </Card>
    </div>
  );
}
