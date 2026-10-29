"use client";

import { useEffect, useMemo, useState } from "react";
import { communityRepository as repo } from "@/modules/communities/repository";
import { DomainIcon } from "@/modules/communities/DomainIcon";
import { UNLOCK_TARGET } from "@/modules/communities/seed";
import { fetchMemberCounts } from "@/modules/memberships/api";
import { communityKey, waitlistProgress } from "@/modules/memberships/progress";
import { ReportsPanel } from "@/modules/moderation/ReportsPanel";
import { fetchStatuses, setStatus, type CommunityStatus } from "./api";

export function AdminPanel({ adminId }: { adminId: string }) {
  const cities = repo.listCities();
  const [section, setSection] = useState<"communities" | "reports">(
    "communities",
  );
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? "");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statuses, setStatuses] = useState<Record<string, CommunityStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchMemberCounts(), fetchStatuses()]).then(
      ([c, s]) => {
        if (!active) return;
        setCounts(c);
        setStatuses(s);
      },
      (err) => {
        console.error("Admin load failed", err);
        if (active) setError("Could not load data. Refresh the page.");
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    let members = 0;
    let ready = 0;
    let live = 0;
    for (const city of cities) {
      for (const c of repo.listCommunitiesByCity(city.slug)) {
        const key = communityKey(c.citySlug, c.domainSlug);
        const n = counts[key] ?? 0;
        members += n;
        if (statuses[key] === "live") live += 1;
        else if (n >= UNLOCK_TARGET) ready += 1;
      }
    }
    return { members, ready, live };
  }, [cities, counts, statuses]);

  async function change(domainSlug: string, status: CommunityStatus) {
    const key = communityKey(citySlug, domainSlug);
    setBusyKey(key);
    setError(null);
    try {
      await setStatus(adminId, citySlug, domainSlug, status);
      setStatuses((s) => ({ ...s, [key]: status }));
    } catch (err) {
      console.error("Status change failed", err);
      setError(
        `Could not change status. (code: ${(err as { code?: string }).code ?? "unknown"})`,
      );
    } finally {
      setBusyKey(null);
    }
  }

  const communities = repo.listCommunitiesByCity(citySlug);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Admin</h1>

      <div
        role="tablist"
        aria-label="Admin sections"
        className="flex gap-1 border-b border-line"
      >
        {(["communities", "reports"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => setSection(key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium capitalize ${
              section === key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {section === "reports" && <ReportsPanel adminId={adminId} />}
      {section === "communities" && (
        <>
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["Waitlist members", totals.members],
              ["Ready to open", totals.ready],
              ["Live communities", totals.live],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <dd className="text-2xl font-semibold text-primary">{value}</dd>
                <dt className="text-sm text-muted">{label}</dt>
              </div>
            ))}
          </dl>

          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="City"
          >
            {cities.map((c) => (
              <button
                key={c.slug}
                type="button"
                role="tab"
                aria-selected={c.slug === citySlug}
                onClick={() => setCitySlug(c.slug)}
                className={
                  c.slug === citySlug
                    ? "rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-on-primary"
                    : "rounded-full bg-mint px-4 py-1.5 text-sm font-medium text-primary hover:opacity-80"
                }
              >
                {c.name}
              </button>
            ))}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <ul className="space-y-3">
            {communities.map((c) => {
              const key = communityKey(c.citySlug, c.domainSlug);
              const n = counts[key] ?? 0;
              const progress = waitlistProgress(n, UNLOCK_TARGET);
              const status = statuses[key] ?? "waitlist";
              return (
                <li
                  key={key}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint text-primary">
                    <DomainIcon slug={c.domainSlug} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium">{c.name}</p>
                    <div className="h-1.5 max-w-xs overflow-hidden rounded-full bg-mint">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted">
                      {n} of {UNLOCK_TARGET} members
                      {progress.reached && status === "waitlist"
                        ? " · ready to open"
                        : ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">Status of {c.name}</span>
                    <select
                      value={status}
                      disabled={busyKey === key}
                      onChange={(e) =>
                        void change(
                          c.domainSlug,
                          e.target.value as CommunityStatus,
                        )
                      }
                      className="rounded-lg border border-line bg-surface px-3 py-1.5"
                    >
                      <option value="waitlist">Waitlist</option>
                      <option value="live">Live</option>
                    </select>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
