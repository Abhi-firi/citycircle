import Link from "next/link";
import { communityRepository as repo } from "@/modules/communities/repository";
import { UserAvatar, type AvatarSize } from "@/components/UserAvatar";
import type { Person } from "./api";

export function PersonAvatar({
  name,
  path,
  size = "lg",
}: {
  name: string;
  path?: string | null;
  size?: AvatarSize;
}) {
  return <UserAvatar name={name} path={path} size={size} />;
}

export function memberHref(id: string): string {
  return `/members/?id=${encodeURIComponent(id)}`;
}

/** A person with avatar, headline and an action area on the right. */
export function PersonRow({
  person,
  note,
  action,
}: {
  person: Person;
  note?: string;
  action?: React.ReactNode;
}) {
  const city = repo.getCity(person.citySlug);
  return (
    <li className="flex items-center gap-3 py-3">
      <PersonAvatar name={person.name} path={person.avatarPath} />
      <div className="min-w-0 flex-1">
        <Link
          href={memberHref(person.id)}
          className="block truncate font-medium hover:text-primary hover:underline"
        >
          {person.name}
        </Link>
        {person.headline && (
          <p className="truncate text-sm text-muted">{person.headline}</p>
        )}
        <p className="truncate text-xs text-muted">
          {[city?.name, note].filter(Boolean).join(" · ")}
        </p>
      </div>
      {action}
    </li>
  );
}
