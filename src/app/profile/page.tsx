"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/modules/auth/AuthProvider";
import { ProfileForm } from "@/modules/profiles/ProfileForm";
import { communityRepository as repo } from "@/modules/communities/repository";
import { fetchMyMemberships } from "@/modules/memberships/api";
import { ProfileView, type JoinedCommunity } from "@/modules/profiles/ProfileView";
import { isProfileComplete, type ProfileInput } from "@/modules/profiles/validation";

function ProfileLoader({ user }: { user: User }) {
  const [profile, setProfile] = useState<ProfileInput | null>(null);
  const [communities, setCommunities] = useState<JoinedCommunity[]>([]);
  const [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await getSupabase()
          .from("profiles")
          .select("full_name, headline, city_slug, domain_slugs, current_role_title, current_company")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;

        const metaName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
        const loaded: ProfileInput = {
          fullName: data?.full_name ?? metaName,
          headline: data?.headline ?? "",
          citySlug: data?.city_slug ?? "",
          domainSlugs: data?.domain_slugs ?? [],
          roleTitle: data?.current_role_title ?? "",
          company: data?.current_company ?? "",
        };
        setProfile(loaded);
        // New members go straight to the form; returning members see their profile.
        setEditing(!isProfileComplete(loaded));

        // Joined communities are a nice-to-have: a failure here must not hide the profile.
        try {
          const keys = await fetchMyMemberships(user.id);
          if (active) {
            setCommunities(
              keys.flatMap((key) => {
                const [citySlug = "", domainSlug = ""] = key.split("/");
                const community = repo.getCommunity(citySlug, domainSlug);
                return community
                  ? [{ key, name: community.name, href: `/cities/${citySlug}/${domainSlug}/` }]
                  : [];
              }),
            );
          }
        } catch (err) {
          console.error("Could not load communities", err);
        }
      } catch (err) {
        console.error("Profile load failed", err);
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (failed) return <p className="text-muted">Could not load your profile. Please refresh the page.</p>;
  if (!profile) return <p className="text-muted">Loading your profile...</p>;

  if (editing) {
    const firstTime = !isProfileComplete(profile);
    return (
      <div className="space-y-4">
        {firstTime && (
          <p className="max-w-xl text-muted">
            Tell us a little about you. It takes under a minute and you can change it any time.
          </p>
        )}
        <ProfileForm
          userId={user.id}
          initial={profile}
          onSaved={(saved) => {
            setProfile(saved);
            setEditing(false);
          }}
          onCancel={firstTime ? undefined : () => setEditing(false)}
        />
      </div>
    );
  }

  return <ProfileView profile={profile} communities={communities} onEdit={() => setEditing(true)} />;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, configError } = useAuth();

  useEffect(() => {
    if (!loading && !configError && !user) router.replace("/login/");
  }, [loading, configError, user, router]);

  if (configError) return <p className="text-muted">Profiles are not available right now.</p>;
  if (loading || !user) return <p className="text-muted">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Your profile</h1>
      <ProfileLoader user={user} />
    </div>
  );
}
