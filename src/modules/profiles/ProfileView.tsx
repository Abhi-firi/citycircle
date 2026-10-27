import { communityRepository as repo } from "@/modules/communities/repository";
import type { ProfileInput } from "./validation";

export function ProfileView({ profile, onEdit }: { profile: ProfileInput; onEdit: () => void }) {
  const city = repo.getCity(profile.citySlug);
  const domains = profile.domainSlugs
    .map((slug) => repo.getDomain(slug))
    .filter((d): d is NonNullable<typeof d> => d !== undefined);

  const workLine = [profile.roleTitle, profile.company].filter(Boolean).join(" at ");

  return (
    <section aria-label="Your profile" className="max-w-xl space-y-5 rounded-xl border border-line bg-surface p-6">
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-mint text-2xl font-semibold text-deep"
        >
          {profile.fullName.trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold">{profile.fullName}</h2>
          {profile.headline && <p className="text-fg">{profile.headline}</p>}
          {workLine && <p className="text-sm text-muted">{workLine}</p>}
          {city && <p className="text-sm text-muted">{city.name}</p>}
        </div>
      </div>

      {domains.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Interested in</h3>
          <ul className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <li key={d.slug} className="rounded-full bg-mint px-3 py-1 text-sm text-primary">
                {d.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-primary"
      >
        Edit profile
      </button>
    </section>
  );
}
