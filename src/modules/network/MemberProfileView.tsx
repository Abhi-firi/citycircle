"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/Card";
import { communityRepository as repo } from "@/modules/communities/repository";
import {
  fetchConnectionRows,
  fetchMemberProfile,
  type MemberProfile,
} from "./api";
import { ReportButton } from "@/modules/moderation/ReportButton";
import { blockMember, moderationErrorMessage } from "@/modules/moderation/api";
import { startConversation } from "@/modules/messages/api";
import { ConnectButton } from "./ConnectButton";
import { genderLabel } from "@/modules/profiles/validation";
import { relationshipWith, type ConnectionRow } from "./logic";
import { PersonAvatar } from "./PersonRow";

export function MemberProfileView({
  userId,
  memberId,
}: {
  userId: string;
  memberId: string;
}) {
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [state, setState] = useState<
    "loading" | "ready" | "missing" | "failed"
  >("loading");
  const router = useRouter();
  const [reload, setReload] = useState(0);
  const [blockError, setBlockError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchMemberProfile(memberId), fetchConnectionRows()]).then(
      ([p, r]) => {
        if (!active) return;
        setProfile(p);
        setRows(r);
        setState(p ? "ready" : "missing");
      },
      (err) => {
        console.error("Could not load member", err);
        if (active) setState("failed");
      },
    );
    return () => {
      active = false;
    };
  }, [memberId, reload]);

  if (state === "loading") return <p className="text-muted">Loading...</p>;
  if (state === "failed")
    return (
      <p className="text-muted">
        Could not load this profile. Please refresh the page.
      </p>
    );
  if (state === "missing" || !profile)
    return <p className="text-muted">This member could not be found.</p>;

  const isMe = profile.id === userId;
  const city = repo.getCity(profile.citySlug);
  const work = [profile.roleTitle, profile.company]
    .filter(Boolean)
    .join(" at ");
  const domains = profile.domainSlugs.flatMap((s) => {
    const d = repo.getDomain(s);
    return d ? [d] : [];
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <PersonAvatar
            name={profile.name}
            path={profile.avatarPath}
            size="xl"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold">{profile.name}</h1>
            {profile.headline && <p>{profile.headline}</p>}
            {work && <p className="text-sm text-muted">{work}</p>}
            {(city || profile.gender) && (
              <p className="text-sm text-muted">
                {[genderLabel(profile.gender), city?.name]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          {isMe ? (
            <Link
              href="/profile/"
              className="rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:border-primary"
            >
              Edit profile
            </Link>
          ) : (
            <span className="flex flex-col items-end gap-2">
              {relationshipWith(rows, userId, profile.id).state ===
                "connected" && (
                <button
                  type="button"
                  className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-on-primary hover:opacity-90"
                  onClick={async () => {
                    try {
                      const id = await startConversation(profile.id);
                      router.push(`/messages/?c=${encodeURIComponent(id)}`);
                    } catch (err) {
                      console.error("Could not start conversation", err);
                      setBlockError(
                        "Could not open the chat. Please try again.",
                      );
                    }
                  }}
                >
                  Message
                </button>
              )}
              <ConnectButton
                me={userId}
                other={profile.id}
                relationship={relationshipWith(rows, userId, profile.id)}
                onChange={() => setReload((n) => n + 1)}
              />
            </span>
          )}
        </div>
        {!isMe && (
          <div className="flex flex-wrap items-center gap-4 border-t border-line pt-3">
            <ReportButton
              me={userId}
              targetType="member"
              targetId={profile.id}
              label="Report member"
            />
            <button
              type="button"
              className="text-xs text-muted hover:text-fg"
              onClick={async () => {
                if (
                  !window.confirm(
                    `Block ${profile.name}? You will no longer see each other, and any connection will be removed.`,
                  )
                )
                  return;
                try {
                  await blockMember(userId, profile.id);
                  setReload((n) => n + 1);
                } catch (err) {
                  console.error("Block failed", err);
                  setBlockError(moderationErrorMessage(err));
                }
              }}
            >
              Block member
            </button>
            {blockError && (
              <span role="alert" className="text-xs text-red-600">
                {blockError}
              </span>
            )}
          </div>
        )}
      </Card>

      {profile.about && (
        <Card className="space-y-2 p-6">
          <h2 className="font-semibold">About</h2>
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {profile.about}
          </p>
        </Card>
      )}

      {(profile.skills.length > 0 || profile.experienceYears !== null) && (
        <Card className="space-y-3 p-6">
          <h2 className="font-semibold">Experience and skills</h2>
          {profile.experienceYears !== null && (
            <p className="text-sm text-muted">
              {profile.experienceYears}{" "}
              {profile.experienceYears === 1 ? "year" : "years"} of experience
            </p>
          )}
          {profile.skills.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <li
                  key={s}
                  className="rounded-full bg-mint px-3 py-1 text-sm text-primary"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {domains.length > 0 && (
        <Card className="space-y-3 p-6">
          <h2 className="font-semibold">Interested in</h2>
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
        </Card>
      )}
    </div>
  );
}
