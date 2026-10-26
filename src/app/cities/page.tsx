import type { Metadata } from "next";
import Link from "next/link";
import { communityRepository as repo } from "@/modules/communities/repository";

export const metadata: Metadata = { title: "Cities" };

export default function CitiesPage() {
  const cities = repo.listCities();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Choose your city</h1>
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
    </div>
  );
}
