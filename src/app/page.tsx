import Link from "next/link";
import { communityRepository as repo } from "@/modules/communities/repository";

export default function HomePage() {
  const cities = repo.listCities();
  const domains = repo.listDomains();

  return (
    <div className="space-y-14">
      <section className="space-y-5">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Find and join the professional communities in your city.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Curated, city-wise communities for investors, founders, coders, recruiters, creators and
          builders. Free for members. Communities are created by the City Circle team, so every
          group stays relevant.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup/"
            className="inline-block rounded-lg bg-accent px-5 py-3 font-medium text-accent-fg hover:opacity-90"
          >
            Create your profile
          </Link>
          <Link
            href="/cities/"
            className="inline-block rounded-lg border border-line px-5 py-3 font-medium hover:border-accent"
          >
            Explore your city
          </Link>
        </div>
      </section>

      <section aria-labelledby="cities-heading" className="space-y-4">
        <h2 id="cities-heading" className="text-2xl font-semibold">
          Launching in 8 metro cities
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cities.map((city) => (
            <li key={city.slug}>
              <Link
                href={`/cities/${city.slug}/`}
                className="block rounded-xl border border-line bg-surface p-4 hover:border-accent"
              >
                <span className="font-medium">{city.name}</span>
                <span className="mt-1 block text-sm text-muted">{city.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="domains-heading" className="space-y-4">
        <h2 id="domains-heading" className="text-2xl font-semibold">
          A community for every domain
        </h2>
        <ul className="flex flex-wrap gap-2">
          {domains.map((domain) => (
            <li
              key={domain.slug}
              className="rounded-full bg-accent-soft px-3 py-1 text-sm text-accent"
            >
              {domain.name}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
