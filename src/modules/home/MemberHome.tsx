"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Home,
  MessageSquare,
  MapPin,
  ShieldCheck,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { Card } from "@/components/Card";
import { getSupabase } from "@/lib/supabase/client";
import { fetchIsAdmin, fetchStatuses } from "@/modules/admin/api";
import { inputClass } from "@/modules/auth/Field";
import { communityRepository as repo } from "@/modules/communities/repository";
import { DomainIcon } from "@/modules/communities/DomainIcon";
import {
  fetchMemberCounts,
  fetchMyMemberships,
} from "@/modules/memberships/api";
import { communityKey } from "@/modules/memberships/progress";
import {
  PAGE_SIZE,
  createPost,
  fetchHomeFeed,
  writeErrorMessage,
  type Post,
} from "@/modules/posts/api";
import { PostCard } from "@/modules/posts/CommunityFeed";
import { MAX_POST, validateBody } from "@/modules/posts/text";
import {
  fetchConnectionRows,
  fetchSuggestions,
  type Suggestion,
} from "@/modules/network/api";
import { ConnectButton } from "@/modules/network/ConnectButton";
import { relationshipWith, type ConnectionRow } from "@/modules/network/logic";
import { PersonRow } from "@/modules/network/PersonRow";
import { loadExtras } from "@/modules/profiles/CompleteProfile";
import { completionPercent, completionSteps } from "@/modules/profiles/extras";

type Basics = { name: string; headline: string; citySlug: string };

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const dims = size === "lg" ? "h-16 w-16 text-2xl" : "h-10 w-10 text-base";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-mint font-semibold text-deep ${dims}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function communityName(citySlug: string, domainSlug: string): string {
  return (
    repo.getCommunity(citySlug, domainSlug)?.name ?? `${domainSlug} ${citySlug}`
  );
}

export function MemberHome({
  userId,
  fallbackName,
}: {
  userId: string;
  fallbackName: string;
}) {
  const [basics, setBasics] = useState<Basics | null>(null);
  const [memberships, setMemberships] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [liveKeys, setLiveKeys] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  const [nextStep, setNextStep] = useState<string | null>(null);
  const [people, setPeople] = useState<Suggestion[]>([]);
  const [connRows, setConnRows] = useState<ConnectionRow[]>([]);
  const [peopleReload, setPeopleReload] = useState(0);

  useEffect(() => {
    let active = true;
    getSupabase()
      .from("profiles")
      .select("full_name, headline, city_slug")
      .eq("id", userId)
      .maybeSingle()
      .then(
        ({ data }) =>
          active &&
          setBasics({
            name: data?.full_name || fallbackName || "Member",
            headline: data?.headline ?? "",
            citySlug: data?.city_slug ?? "",
          }),
        () =>
          active &&
          setBasics({
            name: fallbackName || "Member",
            headline: "",
            citySlug: "",
          }),
      );
    // Each piece loads on its own so one failure never blanks the page.
    fetchMyMemberships(userId).then(
      (m) => active && setMemberships(m),
      () => {},
    );
    fetchMemberCounts().then(
      (c) => active && setCounts(c),
      () => {},
    );
    fetchStatuses().then(
      (s) =>
        active &&
        setLiveKeys(new Set(Object.keys(s).filter((k) => s[k] === "live"))),
      () => {},
    );
    fetchIsAdmin().then(
      (v) => active && setIsAdmin(v),
      () => {},
    );
    loadExtras(userId).then(
      (e) => {
        if (!active) return;
        setPercent(completionPercent(e));
        setNextStep(completionSteps(e).find((s) => !s.done)?.title ?? null);
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [userId, fallbackName]);

  useEffect(() => {
    let active = true;
    Promise.all([fetchSuggestions(5), fetchConnectionRows()]).then(
      ([sug, rows]) => {
        if (!active) return;
        setPeople(sug);
        setConnRows(rows);
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [userId, peopleReload]);

  const joined = useMemo(
    () =>
      memberships.flatMap((key) => {
        const [c = "", d = ""] = key.split("/");
        const community = repo.getCommunity(c, d);
        return community ? [{ key, community, live: liveKeys.has(key) }] : [];
      }),
    [memberships, liveKeys],
  );

  const trending = useMemo(() => {
    const mine = new Set(memberships);
    return repo
      .listCities()
      .flatMap((c) => repo.listCommunitiesByCity(c.slug))
      .map((c) => ({
        c,
        key: communityKey(c.citySlug, c.domainSlug),
        n: counts[communityKey(c.citySlug, c.domainSlug)] ?? 0,
      }))
      .filter((x) => !mine.has(x.key))
      .sort(
        (a, b) =>
          b.n - a.n ||
          Number(b.c.citySlug === basics?.citySlug) -
            Number(a.c.citySlug === basics?.citySlug),
      )
      .slice(0, 5);
  }, [memberships, counts, basics?.citySlug]);

  if (!basics) return <p className="text-muted">Loading your home...</p>;

  const city = repo.getCity(basics.citySlug);
  const firstName = basics.name.trim().split(/\s+/)[0] ?? basics.name;
  const totalMembers = Object.values(counts).reduce((a, b) => a + b, 0);
  const cities = repo.listCities();
  const communityTotal = cities.length * repo.listDomains().length;
  const postable = joined.filter((j) => j.live || isAdmin);

  const sideLink =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-pale";

  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)_19rem]">
      {/* Left sidebar */}
      <aside className="hidden space-y-4 lg:block">
        <Card className="p-3">
          <nav aria-label="Sidebar" className="space-y-1">
            <Link
              href="/"
              aria-current="page"
              className={`${sideLink} bg-mint text-primary`}
            >
              <Home aria-hidden="true" className="h-4 w-4" /> Home
            </Link>
            <Link href="/network/" className={sideLink}>
              <UserPlus aria-hidden="true" className="h-4 w-4" /> My Network
            </Link>
            <Link href="/messages/" className={sideLink}>
              <MessageSquare aria-hidden="true" className="h-4 w-4" /> Messages
            </Link>
            <Link href="/cities/" className={sideLink}>
              <Users aria-hidden="true" className="h-4 w-4" /> Communities
            </Link>
            {city && (
              <Link href={`/cities/${city.slug}/`} className={sideLink}>
                <MapPin aria-hidden="true" className="h-4 w-4" /> {city.name}
              </Link>
            )}
            <Link href="/profile/" className={sideLink}>
              <User aria-hidden="true" className="h-4 w-4" /> My profile
            </Link>
            {isAdmin && (
              <Link href="/admin/" className={sideLink}>
                <ShieldCheck aria-hidden="true" className="h-4 w-4" /> Admin
              </Link>
            )}
          </nav>
        </Card>
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Your communities</h2>
          {joined.length === 0 ? (
            <p className="text-sm text-muted">
              None yet. Join one from the right.
            </p>
          ) : (
            <ul className="space-y-1">
              {joined.map(({ key, community }) => (
                <li key={key}>
                  <Link
                    href={`/cities/${community.citySlug}/${community.domainSlug}/`}
                    className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-pale"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-mint text-primary">
                      <DomainIcon
                        slug={community.domainSlug}
                        className="h-4 w-4"
                      />
                    </span>
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-medium">
                        {community.name}
                      </span>
                      <span className="block text-xs text-muted">
                        {counts[key] ?? 0} members
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>

      {/* Center */}
      <div className="min-w-0 space-y-5">
        <Hero
          firstName={firstName}
          cityName={city?.name}
          members={totalMembers}
          communities={communityTotal}
          cities={cities.length}
        />
        <HomeComposer
          userId={userId}
          name={basics.name}
          options={postable.map((j) => ({
            key: j.key,
            label: j.community.name,
          }))}
          hasJoined={joined.length > 0}
        />
        <HomeFeed
          userId={userId}
          isAdmin={isAdmin}
          joinedKeys={joined.map((j) => j.key)}
          hasJoined={joined.length > 0}
        />
      </div>

      {/* Right rail */}
      <aside className="space-y-4">
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <Avatar name={basics.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{basics.name}</p>
              {basics.headline && (
                <p className="truncate text-sm text-muted">{basics.headline}</p>
              )}
              {city && <p className="text-xs text-muted">{city.name}</p>}
            </div>
          </div>
          {percent !== null && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Complete your profile</span>
                <span className="font-medium text-primary">{percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-mint">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {percent < 100 && nextStep && (
                <Link
                  href="/profile/"
                  className="flex items-center justify-between rounded-xl bg-pale p-3 text-sm hover:opacity-90"
                >
                  <span>
                    <span className="block font-medium">{nextStep}</span>
                    <span className="block text-xs text-muted">
                      Help others know you better.
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 text-primary"
                  />
                </Link>
              )}
            </div>
          )}
        </Card>

        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Trending communities</h2>
            <Link
              href="/cities/"
              className="text-xs font-medium text-primary hover:underline"
            >
              See all
            </Link>
          </div>
          <ul className="space-y-3">
            {trending.map(({ c, n }) => (
              <li key={c.id} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint text-primary">
                  <DomainIcon slug={c.domainSlug} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block text-xs text-muted">
                    {n} {n === 1 ? "member" : "members"}
                  </span>
                </span>
                <Link
                  href={`/cities/${c.citySlug}/${c.domainSlug}/`}
                  className="rounded-full bg-mint px-3 py-1 text-xs font-medium text-primary hover:opacity-80"
                >
                  Join
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        {people.length > 0 && (
          <Card className="space-y-1 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recommended people</h2>
              <Link
                href="/network/"
                className="text-xs font-medium text-primary hover:underline"
              >
                See all
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {people.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  note={
                    p.sharedCommunities > 0
                      ? `${p.sharedCommunities} shared`
                      : undefined
                  }
                  action={
                    <ConnectButton
                      me={userId}
                      other={p.id}
                      relationship={relationshipWith(connRows, userId, p.id)}
                      onChange={() => setPeopleReload((n) => n + 1)}
                    />
                  }
                />
              ))}
            </ul>
          </Card>
        )}

        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">Explore cities</h2>
          <ul className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/cities/${c.slug}/`}
                  className="rounded-full bg-mint px-3 py-1 text-sm text-primary hover:opacity-80"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </aside>
    </div>
  );
}

function Hero({
  firstName,
  cityName,
  members,
  communities,
  cities,
}: {
  firstName: string;
  cityName?: string;
  members: number;
  communities: number;
  cities: number;
}) {
  const stats = [
    { label: "Members", value: members },
    { label: "Communities", value: communities },
    { label: "Cities", value: cities },
  ];
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-deep to-primary p-6 text-white shadow-sm sm:p-8">
      <svg
        aria-hidden="true"
        viewBox="0 0 600 160"
        preserveAspectRatio="xMaxYMax slice"
        className="pointer-events-none absolute bottom-0 right-0 h-40 w-full text-white/10"
        fill="currentColor"
      >
        <rect x="20" y="90" width="40" height="70" />
        <rect x="70" y="60" width="50" height="100" />
        <rect x="130" y="100" width="35" height="60" />
        <rect x="175" y="30" width="55" height="130" />
        <rect x="240" y="75" width="45" height="85" />
        <rect x="295" y="50" width="60" height="110" />
        <rect x="365" y="95" width="40" height="65" />
        <rect x="415" y="20" width="50" height="140" />
        <rect x="475" y="70" width="45" height="90" />
        <rect x="530" y="100" width="50" height="60" />
      </svg>
      <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-mint">
            Welcome back, {firstName}
          </p>
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
            Your City. Your Network.
            <br />
            Endless Opportunities.
          </h1>
          <p className="max-w-md text-sm text-mint">
            {cityName
              ? `Communities in ${cityName} are opening one by one.`
              : "Pick your city to find communities near you."}
          </p>
          <Link
            href={cityName ? "/cities/" : "/profile/"}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-deep hover:bg-mint"
          >
            {cityName ? "Explore communities" : "Set your city"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <dl className="grid grid-cols-3 gap-3 rounded-xl bg-white/10 p-4 text-center backdrop-blur sm:grid-cols-1 sm:text-left">
          {stats.map((s) => (
            <div key={s.label}>
              <dd className="text-xl font-semibold">{s.value}</dd>
              <dt className="text-xs text-mint">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HomeComposer({
  userId,
  name,
  options,
  hasJoined,
}: {
  userId: string;
  name: string;
  options: { key: string; label: string }[];
  hasJoined: boolean;
}) {
  const [text, setText] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const chosen = target || options[0]?.key || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateBody(text, MAX_POST);
    if (problem) return setError(problem);
    const [citySlug = "", domainSlug = ""] = chosen.split("/");
    setBusy(true);
    setError(null);
    try {
      await createPost(userId, citySlug, domainSlug, text);
      setText("");
      setDone(true);
      window.dispatchEvent(new Event("citycircle:posted"));
    } catch (err) {
      console.error("Post failed", err);
      setError(writeErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="flex items-start gap-3">
          <Avatar name={name} />
          <div className="flex-1 space-y-3">
            <label htmlFor="home-post" className="sr-only">
              Share something
            </label>
            <textarea
              id="home-post"
              rows={2}
              value={text}
              disabled={options.length === 0}
              onChange={(e) => {
                setText(e.target.value);
                setDone(false);
              }}
              placeholder={
                options.length === 0
                  ? hasJoined
                    ? "Posting opens when one of your communities goes live."
                    : "Join a community to start sharing."
                  : "Share your thoughts, an update, or ask a question..."
              }
              className={`${inputClass} rounded-xl`}
            />
            {options.length > 0 && text.trim() !== "" && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Post in</span>
                  <select
                    value={chosen}
                    onChange={(e) => setTarget(e.target.value)}
                    className="rounded-lg border border-line bg-surface px-2 py-1.5"
                  >
                    {options.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? "Posting..." : "Post"}
                </button>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            {done && <p className="text-sm text-primary">Posted.</p>}
          </div>
        </div>
      </form>
    </Card>
  );
}

function HomeFeed({
  userId,
  isAdmin,
  joinedKeys,
  hasJoined,
}: {
  userId: string;
  isAdmin: boolean;
  joinedKeys: string[];
  hasJoined: boolean;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    fetchHomeFeed().then(
      (first) => {
        if (!active) return;
        setPosts(first);
        setHasMore(first.length === PAGE_SIZE);
        setFailed(false);
        setLoaded(true);
      },
      (err) => {
        console.error("Could not load the feed", err);
        if (!active) return;
        setFailed(true);
        setLoaded(true);
      },
    );
    return () => {
      active = false;
    };
  }, [reload]);

  useEffect(() => {
    const again = () => setReload((n) => n + 1);
    window.addEventListener("citycircle:posted", again);
    return () => window.removeEventListener("citycircle:posted", again);
  }, []);

  async function loadMore() {
    const last = posts[posts.length - 1];
    if (!last) return;
    try {
      const next = await fetchHomeFeed(last.createdAt);
      setPosts((p) => [...p, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch (err) {
      console.error("Could not load more", err);
    }
  }

  const tabs = [
    { key: "all", label: "For you" },
    ...joinedKeys.slice(0, 4).map((k) => {
      const [c = "", d = ""] = k.split("/");
      return { key: k, label: repo.getDomain(d)?.name ?? c };
    }),
  ];
  const visible =
    filter === "all"
      ? posts
      : posts.filter((p) => communityKey(p.citySlug, p.domainSlug) === filter);

  return (
    <section aria-label="Feed" className="space-y-4">
      {tabs.length > 1 && (
        <div
          role="tablist"
          aria-label="Feed filter"
          className="flex gap-1 overflow-x-auto border-b border-line"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={filter === t.key}
              onClick={() => setFilter(t.key)}
              className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium ${
                filter === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {failed ? (
        <Card className="p-5 text-sm text-muted">
          Could not load the feed. Please refresh the page.
        </Card>
      ) : !loaded ? (
        <p className="text-sm text-muted">Loading your feed...</p>
      ) : visible.length === 0 ? (
        <Card className="space-y-2 p-6 text-center">
          <p className="font-medium">Nothing here yet</p>
          <p className="text-sm text-muted">
            {hasJoined
              ? "Posts from your communities show up here as soon as they go live."
              : "Join a community on the right. Its posts will show up here once it opens."}
          </p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {visible.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              communityName={communityName(post.citySlug, post.domainSlug)}
              userId={userId}
              isAdmin={isAdmin}
              onDeleted={() =>
                setPosts((p) => p.filter((x) => x.id !== post.id))
              }
            />
          ))}
        </ul>
      )}
      {hasMore && filter === "all" && (
        <button
          type="button"
          onClick={() => void loadMore()}
          className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-primary"
        >
          Load more
        </button>
      )}
    </section>
  );
}
