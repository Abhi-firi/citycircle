"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, MapPin, MessageSquare, Users } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { communityRepository as repo } from "@/modules/communities/repository";
import { DomainIcon } from "@/modules/communities/DomainIcon";
import { UNLOCK_TARGET } from "@/modules/communities/seed";
import { fetchMemberCounts, fetchMyMemberships } from "@/modules/memberships/api";
import { communityKey, waitlistProgress } from "@/modules/memberships/progress";
import { loadExtras } from "@/modules/profiles/CompleteProfile";
import { completionPercent } from "@/modules/profiles/extras";

type Basics = { name: string; headline: string; citySlug: string; domainSlugs: string[] };

export function MemberHome({ userId, fallbackName }: { userId: string; fallbackName: string }) {
  const [basics, setBasics] = useState<Basics | null>(null);
  const [memberships, setMemberships] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [percent, setPercent] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const db = getSupabase();
    // Each piece loads on its own so one failure never blanks the page.
    db.from("profiles")
      .select("full_name, headline, city_slug, domain_slugs")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setBasics({
          name: data?.full_name || fallbackName || "Member",
          headline: data?.headline ?? "",
          citySlug: data?.city_slug ?? "",
          domainSlugs: data?.domain_slugs ?? [],
        });
      }, () => active && setBasics({ name: fallbackName || "Member", headline: "", citySlug: "", domainSlugs: [] }));
    fetchMyMemberships(userId).then((m) => active && setMemberships(m), () => {});
    fetchMemberCounts().then((c) => active && setCounts(c), () => {});
    loadExtras(userId).then((e) => active && setPercent(completionPercent(e)), () => {});
    return () => {
      active = false;
    };
  }, [userId, fallbackName]);

  if (!basics) return <p className="text-muted">Loading your home...</p>;

  const city = repo.getCity(basics.citySlug);
  const firstName = basics.name.trim().split(/\s+/)[0] ?? basics.name;
  const joined = memberships.flatMap((key) => {
    const [c = "", d = ""] = key.split("/");
    const community = repo.getCommunity(c, d);
    return community ? [{ key, community, citySlug: c, domainSlug: d }] : [];
  });
  const suggestions = city
    ? repo
        .listCommunitiesByCity(city.slug)
        .filter((c) => !memberships.includes(communityKey(c.citySlug, c.domainSlug)))
        .sort(
          (a, b) =>
            Number(basics.domainSlugs.includes(b.domainSlug)) - Number(basics.domainSlugs.includes(a.domainSlug)),
        )
        .slice(0, 5)
    : [];
  const otherCities = repo.listCities().filter((c) => c.slug !== basics.citySlug).slice(0, 4);

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)_17rem]">
      {/* Left: identity */}
      <aside className="space-y-4">
        <section className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="h-14 bg-deep" aria-hidden="true" />
          <div className="-mt-7 space-y-1 px-4 pb-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface bg-mint text-xl font-semibold text-deep"
            >
              {basics.name.trim().charAt(0).toUpperCase()}
            </div>
            <p className="pt-1 font-semibold">{basics.name}</p>
            {basics.headline && <p className="text-sm text-muted">{basics.headline}</p>}
            {city && (
              <p className="flex items-center gap-1 text-sm text-muted">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                {city.name}
              </p>
            )}
            <Link href="/profile/" className="inline-block pt-2 text-sm font-medium text-primary hover:underline">
              View profile
            </Link>
          </div>
        </section>
        {percent !== null && percent < 100 && (
          <section className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">Profile strength</span>
              <span className="font-medium text-primary">{percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-mint">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
            <Link href="/profile/" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Complete your profile <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}
      </aside>

      {/* Center: main column */}
      <div className="min-w-0 space-y-4">
        <section className="rounded-xl bg-deep p-6 text-white">
          <h1 className="text-2xl font-semibold">Welcome, {firstName}</h1>
          <p className="mt-1 text-mint">
            {city
              ? `Here is what is happening around you in ${city.name}.`
              : "Pick your city to see communities near you."}
          </p>
          {!city && (
            <Link
              href="/profile/"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-deep hover:bg-mint"
            >
              Set your city <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Users aria-hidden="true" className="h-4 w-4 text-primary" /> Your communities
          </h2>
          {joined.length === 0 ? (
            <p className="text-sm text-muted">You have not joined a waitlist yet. Pick one from the right to start.</p>
          ) : (
            <ul className="space-y-3">
              {joined.map(({ key, community, citySlug, domainSlug }) => {
                const count = counts[key];
                const progress = count === undefined ? null : waitlistProgress(count, UNLOCK_TARGET);
                return (
                  <li key={key}>
                    <Link
                      href={`/cities/${citySlug}/${domainSlug}/`}
                      className="flex items-center gap-3 rounded-lg border border-line p-3 hover:border-primary"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint text-primary">
                        <DomainIcon slug={domainSlug} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block font-medium">{community.name}</span>
                        {progress && (
                          <span className="block space-y-1">
                            <span className="block h-1.5 overflow-hidden rounded-full bg-mint">
                              <span className="block h-full rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
                            </span>
                            <span className="block text-xs text-muted">
                              {progress.reached ? "Ready to open" : `${progress.remaining} more people to open`}
                            </span>
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-2 rounded-xl border border-dashed border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <MessageSquare aria-hidden="true" className="h-4 w-4 text-primary" /> Feed
          </h2>
          <p className="text-sm text-muted">
            Posts from your communities will appear here once your first community opens. Joining a
            waitlist is the fastest way to help it open.
          </p>
        </section>
      </div>

      {/* Right: discovery */}
      <aside className="space-y-4">
        {city && suggestions.length > 0 && (
          <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <h2 className="font-semibold">Join in {city.name}</h2>
            <ul className="space-y-2">
              {suggestions.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/cities/${c.citySlug}/${c.domainSlug}/`}
                    className="flex items-center gap-3 rounded-lg p-1 hover:bg-pale"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mint text-primary">
                      <DomainIcon slug={c.domainSlug} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-medium">{repo.getDomain(c.domainSlug)?.name}</span>
                      <span className="block text-xs text-muted">
                        {counts[communityKey(c.citySlug, c.domainSlug)] ?? 0} waiting
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={`/cities/${city.slug}/`} className="text-sm font-medium text-primary hover:underline">
              See all in {city.name}
            </Link>
          </section>
        )}
        <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <h2 className="font-semibold">Explore other cities</h2>
          <ul className="flex flex-wrap gap-2">
            {otherCities.map((c) => (
              <li key={c.slug}>
                <Link href={`/cities/${c.slug}/`} className="rounded-full bg-mint px-3 py-1 text-sm text-primary hover:opacity-80">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
