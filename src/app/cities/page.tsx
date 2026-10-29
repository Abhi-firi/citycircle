import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { communityRepository as repo } from "@/modules/communities/repository";

export const metadata: Metadata = { title: "Cities" };

export default function CitiesPage() {
  const cities = repo.listCities();
  const domainCount = repo.listDomains().length;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Choose your city
        </h1>
        <p className="text-muted">
          Pick a city to see its communities and join a waitlist.
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cities.map((city) => (
          <li key={city.slug}>
            <Link
              href={`/cities/${city.slug}/`}
              className="group flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 hover:border-primary"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint text-primary">
                <MapPin
                  aria-hidden="true"
                  className="h-5 w-5"
                  strokeWidth={1.75}
                />
              </span>
              <span className="text-lg font-medium">{city.name}</span>
              <span className="text-sm text-muted">{city.blurb}</span>
              <span className="mt-auto text-sm font-medium text-primary">
                {domainCount} communities
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
