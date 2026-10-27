"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/modules/auth/AuthProvider";
import { ProfileForm } from "@/modules/profiles/ProfileForm";
import type { ProfileInput } from "@/modules/profiles/validation";

function ProfileLoader({ user }: { user: User }) {
  const [initial, setInitial] = useState<ProfileInput | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getSupabase();
        const [p, d, r] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase.from("profile_details").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("profile_recruiter").select("*").eq("user_id", user.id).maybeSingle(),
        ]);
        if (p.error || d.error || r.error) throw new Error("load failed");
        if (!active) return;

        const metaName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
        setInitial({
          fullName: p.data?.full_name ?? metaName,
          headline: p.data?.headline ?? "",
          about: p.data?.about ?? "",
          citySlug: p.data?.city_slug ?? "",
          domainSlugs: p.data?.domain_slugs ?? [],
          roleTitle: p.data?.current_role_title ?? "",
          company: p.data?.current_company ?? "",
          experienceYears: d.data?.experience_years != null ? String(d.data.experience_years) : "",
          skillsText: (p.data?.skills ?? []).join(", "),
          linkedinUrl: p.data?.linkedin_url ?? "",
          websiteUrl: p.data?.website_url ?? "",
          openToWork: r.data?.open_to_work ?? false,
          noticePeriodDays: r.data?.notice_period_days != null ? String(r.data.notice_period_days) : "",
          ctcMin: r.data?.expected_ctc_min_lpa != null ? String(r.data.expected_ctc_min_lpa) : "",
          ctcMax: r.data?.expected_ctc_max_lpa != null ? String(r.data.expected_ctc_max_lpa) : "",
        });
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (failed) return <p className="text-muted">Could not load your profile. Please refresh the page.</p>;
  if (!initial) return <p className="text-muted">Loading your profile...</p>;
  return <ProfileForm userId={user.id} initial={initial} />;
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
