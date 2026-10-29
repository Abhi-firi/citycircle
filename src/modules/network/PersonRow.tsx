import Link from "next/link";
import { communityRepository as repo } from "@/modules/communities/repository";
import type { Person } from "./api";

export function PersonAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "xl";
}) {
  const dims = size === "xl" ? "h-20 w-20 text-3xl" : "h-12 w-12 text-lg";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-mint font-semibold text-deep ${dims}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
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
      <PersonAvatar name={person.name} />
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
