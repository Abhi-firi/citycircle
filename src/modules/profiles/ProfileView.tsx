import Link from "next/link";
import { communityRepository as repo } from "@/modules/communities/repository";
import { AvatarUploader } from "./AvatarUploader";
import { genderLabel, type ProfileInput } from "./validation";

export type JoinedCommunity = { key: string; name: string; href: string };

export function ProfileView({
  userId,
  avatarPath,
  onAvatarChange,
  profile,
  communities,
  onEdit,
}: {
  userId: string;
  avatarPath: string | null;
  onAvatarChange: (path: string | null) => void;
  profile: ProfileInput;
  communities: JoinedCommunity[];
  onEdit: () => void;
}) {
  const city = repo.getCity(profile.citySlug);
  const domains = profile.domainSlugs
    .map((slug) => repo.getDomain(slug))
    .filter((d): d is NonNullable<typeof d> => d !== undefined);

  const workLine = [profile.roleTitle, profile.company]
    .filter(Boolean)
    .join(" at ");

  return (
    <section
      aria-label="Your profile"
      className="max-w-xl space-y-5 rounded-xl border border-line bg-surface p-6"
    >
      <AvatarUploader
        userId={userId}
        name={profile.fullName}
        path={avatarPath}
        onChange={onAvatarChange}
      />
      <div className="flex items-start gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold">{profile.fullName}</h2>
          {profile.headline && <p className="text-fg">{profile.headline}</p>}
          {workLine && <p className="text-sm text-muted">{workLine}</p>}
          {(city || profile.gender) && (
            <p className="text-sm text-muted">
              {[genderLabel(profile.gender), city?.name]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </div>

      {domains.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Interested in</h3>
          <ul className="flex flex-wrap gap-2">
            {domains.map((d) => (
              <li
                key={d.slug}
                className="rounded-full bg-mint px-3 py-1 text-sm text-primary"
              >
                {d.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Your communities</h3>
        {communities.length === 0 ? (
          <p className="text-sm text-muted">
            You have not joined any waitlist yet.{" "}
            <Link
              href="/cities/"
              className="font-medium text-primary underline"
            >
              Find your city
            </Link>
          </p>
        ) : (
          <ul className="space-y-1">
            {communities.map((c) => (
              <li key={c.key}>
                <Link
                  href={c.href}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {c.name}
                </Link>
                <span className="ml-2 text-xs text-muted">Waitlist</span>
              </li>
            ))}
          </ul>
        )}
      </div>

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
