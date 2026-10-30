"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/modules/auth/AuthProvider";
import { fetchStatuses } from "@/modules/admin/api";
import {
  fetchMemberCounts,
  fetchMyMemberships,
  joinCommunity,
  leaveCommunity,
} from "./api";
import { communityKey, waitlistProgress } from "./progress";

export function JoinPanel({
  citySlug,
  domainSlug,
  communityName,
  cityName,
  unlockTarget,
}: {
  citySlug: string;
  domainSlug: string;
  communityName: string;
  cityName: string;
  unlockTarget: number;
}) {
  const { user, loading: authLoading, configError } = useAuth();
  const key = communityKey(citySlug, domainSlug);

  const [count, setCount] = useState<number | null>(null);
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [live, setLive] = useState(false);

  const userId = user?.id;

  useEffect(() => {
    if (configError || authLoading) return;
    let active = true;
    (async () => {
      try {
        const [counts, mine] = await Promise.all([
          fetchMemberCounts(),
          userId ? fetchMyMemberships(userId) : Promise.resolve([] as string[]),
        ]);
        if (!active) return;
        setCount(counts[key] ?? 0);
        // Status is a nice-to-have: if it fails the community simply shows as a waitlist.
        fetchStatuses().then(
          (s) => active && setLive(s[key] === "live"),
          () => {},
        );
        setJoined(mine.includes(key));
      } catch (err) {
        console.error("Could not load community status", err);
        if (active) setLoadFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [configError, authLoading, userId, key]);

  async function toggle() {
    if (!userId) return;
    setBusy(true);
    setMessage(null);
    try {
      if (joined) {
        await leaveCommunity(userId, citySlug, domainSlug);
        setJoined(false);
        setCount((c) => Math.max(0, (c ?? 1) - 1));
      } else {
        await joinCommunity(userId, citySlug, domainSlug);
        setJoined(true);
        setCount((c) => (c ?? 0) + 1);
      }
    } catch (err) {
      console.error("Membership change failed", err);
      const code = (err as { code?: string }).code;
      setMessage(
        code === "23514"
          ? "You can join up to 20 communities. Leave one to join another."
          : `Something went wrong. Please try again.${code ? ` (code: ${code})` : ""}`,
      );
    } finally {
      setBusy(false);
    }
  }

  if (configError) return null;

  const progress =
    count === null ? null : waitlistProgress(count, unlockTarget);

  return (
    <section
      aria-labelledby="waitlist-heading"
      className="max-w-xl space-y-4 rounded-xl border border-line bg-surface p-5"
    >
      <h2 id="waitlist-heading" className="text-lg font-semibold">
        {live ? "Open" : progress?.reached ? "Almost open" : "Opening soon"}
      </h2>

      {loadFailed ? (
        <p className="text-sm text-muted">
          Could not load the waitlist right now. Please refresh the page.
        </p>
      ) : progress === null ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : (
        <>
          <div className="space-y-2">
            <div
              role="progressbar"
              aria-label={`${communityName} waitlist`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              className="h-2 w-full overflow-hidden rounded-full bg-mint"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-sm text-muted">
              {count === 0
                ? `Be the first to join ${communityName}.`
                : progress.reached
                  ? `${count} members have joined. The ${cityName} team will open this community soon.`
                  : `${count} of ${unlockTarget} members. ${progress.remaining} more needed to open this community.`}
            </p>
          </div>

          {authLoading ? null : user ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={toggle}
                disabled={busy}
                className={
                  joined
                    ? "w-full rounded-lg border border-line px-5 py-3 sm:w-auto font-medium hover:border-primary disabled:opacity-60"
                    : "w-full rounded-lg bg-primary px-5 py-3 sm:w-auto font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
                }
              >
                {busy
                  ? "Please wait..."
                  : joined
                    ? "Leave waitlist"
                    : "Join waitlist"}
              </button>
              {joined && (
                <p className="text-sm text-primary">
                  You are on the waitlist. We will tell you when it opens.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm">
              <Link
                href="/signup/"
                className="font-medium text-primary underline"
              >
                Create an account
              </Link>{" "}
              or{" "}
              <Link
                href="/login/"
                className="font-medium text-primary underline"
              >
                log in
              </Link>{" "}
              to join the waitlist.
            </p>
          )}

          {message && (
            <p role="alert" className="text-sm text-red-600">
              {message}
            </p>
          )}
        </>
      )}
    </section>
  );
}
