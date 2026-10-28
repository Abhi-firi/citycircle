"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { communityRepository as repo } from "@/modules/communities/repository";

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
          Search cities and communities
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
            placeholder="Search cities and communities..."
            autoComplete="off"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </span>
      </form>
      {open && query.trim().length >= 2 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No matches.</li>
          ) : (
            results.map((r) => (
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
                  <span className="flex-1 truncate font-medium">{r.label}</span>
                  <span className="text-xs text-muted">{r.sub}</span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
