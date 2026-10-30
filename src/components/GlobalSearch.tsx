"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { communityRepository as repo } from "@/modules/communities/repository";
import { useAuth } from "@/modules/auth/AuthProvider";
import { searchPeople, type Person } from "@/modules/network/api";
import { toNamePattern } from "@/modules/network/logic";
import { PersonAvatar, memberHref } from "@/modules/network/PersonRow";

type Result = {
  key: string;
  label: string;
  sub: string;
  href: string;
  kind: "city" | "community";
};

export function searchCommunities(query: string, limit = 8): Result[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const cities: Result[] = repo
    .listCities()
    .filter((c) => c.name.toLowerCase().includes(q))
    .map((c) => ({
      key: `c-${c.slug}`,
      label: c.name,
      sub: "City",
      href: `/cities/${c.slug}/`,
      kind: "city" as const,
    }));
  const communities: Result[] = repo
    .listCities()
    .flatMap((c) => repo.listCommunitiesByCity(c.slug))
    .filter((c) => c.name.toLowerCase().includes(q))
    .map((c) => ({
      key: c.id,
      label: c.name,
      sub: "Community",
      href: `/cities/${c.citySlug}/${c.domainSlug}/`,
      kind: "community" as const,
    }));
  return [...cities, ...communities].slice(0, limit);
}

export function GlobalSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchCommunities(query), [query]);
  const { user } = useAuth();
  const [people, setPeople] = useState<{ q: string; list: Person[] }>({
    q: "",
    list: [],
  });
  const pattern = user ? toNamePattern(query) : null;

  useEffect(() => {
    if (!pattern) return;
    let stale = false;
    const t = setTimeout(() => {
      searchPeople(pattern)
        .then((list) => {
          if (!stale) setPeople({ q: pattern, list });
        })
        .catch(() => {
          if (!stale) setPeople({ q: pattern, list: [] });
        });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [pattern]);

  const peopleShown =
    pattern && people.q === pattern
      ? people.list.filter((p) => p.id !== user?.id)
      : [];

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div
      ref={box}
      className={`relative ${className}`}
      onBlur={(e) => {
        if (!box.current?.contains(e.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (results[0]) go(results[0].href);
        }}
      >
        <label htmlFor="global-search" className="sr-only">
          Search people, cities and communities
        </label>
        <span className="flex items-center gap-2 rounded-full bg-bg px-4 py-2 ring-1 ring-line focus-within:ring-primary">
          <Search aria-hidden="true" className="h-4 w-4 text-muted" />
          <input
            id="global-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={
              user
                ? "Search people, cities, communities..."
                : "Search cities and communities..."
            }
            autoComplete="off"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </span>
      </form>
      {open && query.trim().length >= 2 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
          {results.length === 0 && peopleShown.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No matches.</li>
          ) : (
            <>
              {peopleShown.map((p) => (
                <li key={`p-${p.id}`}>
                  <Link
                    href={memberHref(p.id)}
                    onClick={() => go(memberHref(p.id))}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-pale"
                  >
                    <PersonAvatar name={p.name} path={p.avatarPath} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {p.name}
                      </span>
                      {p.headline && (
                        <span className="block truncate text-xs text-muted">
                          {p.headline}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted">Person</span>
                  </Link>
                </li>
              ))}
              {results.map((r) => (
                <li key={r.key}>
                  <Link
                    href={r.href}
                    onClick={() => go(r.href)}
                    className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-pale"
                  >
                    {r.kind === "city" && (
                      <MapPin
                        aria-hidden="true"
                        className="h-4 w-4 text-primary"
                      />
                    )}
                    <span className="flex-1 truncate font-medium">
                      {r.label}
                    </span>
                    <span className="text-xs text-muted">{r.sub}</span>
                  </Link>
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
