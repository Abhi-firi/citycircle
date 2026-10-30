import Link from "next/link";
import { ArrowRight, MapPin, UserPlus, Users } from "lucide-react";
import { DomainIcon } from "@/modules/communities/DomainIcon";
import { communityRepository as repo } from "@/modules/communities/repository";
import { UNLOCK_TARGET } from "@/modules/communities/seed";
import { HomeSwitch } from "@/modules/home/HomeSwitch";

const STEPS = [
  {
    icon: UserPlus,
    title: "Create your profile",
    text: "Tell us your name, city and the domains you care about. It takes under a minute.",
  },
  {
    icon: MapPin,
    title: "Find your city",
    text: "Every metro city has a community for each domain, run by the CityCircle team.",
  },
  {
    icon: Users,
    title: "Join the waitlist",
    text: `A community opens once ${UNLOCK_TARGET} people in your city have joined. We tell you when it does.`,
  },
];

export default function HomePage() {
  const cities = repo.listCities();
  const domains = repo.listDomains();
  const communityCount = cities.length * domains.length;

  return (
    <HomeSwitch>
      <div className="space-y-16">
        <section className="relative overflow-hidden rounded-2xl bg-deep px-5 py-10 text-white sm:px-12 sm:py-16">
          <svg
            aria-hidden="true"
            viewBox="0 0 400 400"
            fill="none"
            className="pointer-events-none absolute -right-24 -top-24 hidden h-[26rem] w-[26rem] text-mint opacity-10 sm:block"
          >
            <circle
              cx="200"
              cy="200"
              r="190"
              stroke="currentColor"
              strokeWidth="12"
            />
            <circle
              cx="200"
              cy="200"
              r="130"
              stroke="currentColor"
              strokeWidth="12"
            />
            <circle
              cx="200"
              cy="200"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
            />
          </svg>
          <div className="relative max-w-2xl space-y-6">
            <p className="text-sm font-medium uppercase tracking-wide text-mint">
              India&apos;s city-first professional network
            </p>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Find the professional communities in your city.
            </h1>
            <p className="max-w-xl text-lg text-mint">
              Investors, founders, coders, recruiters, creators and builders, in{" "}
              {cities.length} metro cities. Free for members. Every community is
              run by the CityCircle team, so it stays relevant.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Link
                href="/signup/"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 font-medium text-deep hover:bg-mint"
              >
                Create your profile
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/cities/"
                className="inline-flex items-center justify-center rounded-lg border border-white/40 px-5 py-3 font-medium text-white hover:bg-white/10"
              >
                Explore cities
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="how-heading" className="space-y-6">
          <h2 id="how-heading" className="text-2xl font-semibold">
            How it works
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="space-y-3 rounded-xl border border-line bg-surface p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint text-primary">
                    <step.icon
                      aria-hidden="true"
                      className="h-5 w-5"
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="text-sm font-medium text-muted">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="cities-heading" className="space-y-6">
          <div className="space-y-1">
            <h2 id="cities-heading" className="text-2xl font-semibold">
              Launching in {cities.length} metro cities
            </h2>
            <p className="text-muted">
              {communityCount} communities, opening one by one as each city
              fills up.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/cities/${city.slug}/`}
                  className="group flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-4 hover:border-primary"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint text-primary">
                    <MapPin
                      aria-hidden="true"
                      className="h-4 w-4"
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="font-medium">{city.name}</span>
                  <span className="mt-auto text-sm text-muted group-hover:text-primary">
                    {domains.length} communities
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="domains-heading" className="space-y-6">
          <h2 id="domains-heading" className="text-2xl font-semibold">
            A community for every domain
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {domains.map((domain) => (
              <li
                key={domain.slug}
                className="flex gap-3 rounded-xl border border-line bg-surface p-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mint text-primary">
                  <DomainIcon slug={domain.slug} className="h-5 w-5" />
                </span>
                <span className="space-y-1">
                  <span className="block font-medium">{domain.name}</span>
                  <span className="block text-sm leading-relaxed text-muted">
                    {domain.description}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col items-start gap-4 rounded-2xl bg-pale p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Be early in your city</h2>
            <p className="text-muted">
              Join a waitlist now and help open your community.
            </p>
          </div>
          <Link
            href="/signup/"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-on-primary hover:opacity-90"
          >
            Create your profile
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </HomeSwitch>
  );
}
