import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { communityRepository as repo } from "@/modules/communities/repository";

type Props = { params: Promise<{ city: string; domain: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return repo
    .listCities()
    .flatMap((city) =>
      repo
        .listCommunitiesByCity(city.slug)
        .map((community) => ({ city: city.slug, domain: community.domainSlug })),
    );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, domain } = await params;
  const community = repo.getCommunity(city, domain);
  return { title: community ? community.name : "Community not found" };
}

export default async function CommunityPage({ params }: Props) {
  const { city: citySlug, domain: domainSlug } = await params;
  const city = repo.getCity(citySlug);
  const domain = repo.getDomain(domainSlug);
  const community = repo.getCommunity(citySlug, domainSlug);
  if (!city || !domain || !community) notFound();

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/cities/" className="hover:text-fg">
          Cities
        </Link>{" "}
        /{" "}
        <Link href={`/cities/${city.slug}/`} className="hover:text-fg">
          {city.name}
        </Link>{" "}
        / {domain.name}
      </nav>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">{community.name}</h1>
        <p className="max-w-2xl text-muted">{domain.description}</p>
      </div>
      <section
        aria-labelledby="status-heading"
        className="max-w-xl space-y-2 rounded-xl border border-line bg-surface p-5"
      >
        <h2 id="status-heading" className="font-semibold">
          Opening soon
        </h2>
        <p className="text-sm text-muted">
          This community opens once {community.unlockTarget} people in {city.name} have joined the
          waitlist. Joining the waitlist is coming soon. You can create your profile now.
        </p>
      </section>
    </div>
  );
}
