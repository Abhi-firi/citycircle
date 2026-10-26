import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { communityRepository as repo } from "@/modules/communities/repository";

type Props = { params: Promise<{ city: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return repo.listCities().map((city) => ({ city: city.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = repo.getCity(citySlug);
  return { title: city ? `Communities in ${city.name}` : "City not found" };
}

export default async function CityPage({ params }: Props) {
  const { city: citySlug } = await params;
  const city = repo.getCity(citySlug);
  if (!city) notFound();

  const communities = repo.listCommunitiesByCity(city.slug);

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/cities/" className="hover:text-fg">
          Cities
        </Link>{" "}
        / {city.name}
      </nav>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Communities in {city.name}</h1>
        <p className="text-muted">{city.blurb}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {communities.map((community) => {
          const domain = repo.getDomain(community.domainSlug);
          return (
            <li key={community.id}>
              <Link
                href={`/cities/${city.slug}/${community.domainSlug}/`}
                className="block h-full rounded-xl border border-line bg-surface p-4 hover:border-accent"
              >
                <span className="font-medium">{community.name}</span>
                <span className="mt-1 block text-sm text-muted">{domain?.description}</span>
                <span className="mt-3 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                  {community.status === "live" ? "Live" : "Opening soon"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
