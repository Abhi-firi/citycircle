import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DomainIcon } from "@/modules/communities/DomainIcon";
import { communityRepository as repo } from "@/modules/communities/repository";
import { CommunityFeed } from "@/modules/posts/CommunityFeed";
import { JoinPanel } from "@/modules/memberships/JoinPanel";

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
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-mint text-primary">
          <DomainIcon slug={domain.slug} className="h-7 w-7" />
        </span>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{community.name}</h1>
          <p className="max-w-2xl text-muted">{domain.description}</p>
        </div>
      </div>
      <JoinPanel
        citySlug={city.slug}
        domainSlug={domain.slug}
        communityName={community.name}
        cityName={city.name}
        unlockTarget={community.unlockTarget}
      />
      <CommunityFeed citySlug={city.slug} domainSlug={domain.slug} />
    </div>
  );
}
