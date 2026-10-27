"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { Field, inputClass } from "@/modules/auth/Field";
import { communityRepository as repo } from "@/modules/communities/repository";
import {
  NOTICE_PERIODS,
  parseSkills,
  validateProfile,
  type ProfileErrors,
  type ProfileInput,
} from "./validation";

export function ProfileForm({ userId, initial }: { userId: string; initial: ProfileInput }) {
  const [form, setForm] = useState<ProfileInput>(initial);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const cities = repo.listCities();
  const domains = repo.listDomains();

  function set<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleDomain(slug: string) {
    set(
      "domainSlugs",
      form.domainSlugs.includes(slug)
        ? form.domainSlugs.filter((d) => d !== slug)
        : [...form.domainSlugs, slug],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const found = validateProfile(
      form,
      cities.map((c) => c.slug),
      domains.map((d) => d.slug),
    );
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus({ kind: "error", text: "Please fix the highlighted fields." });
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabase();
      const num = (v: string) => (v.trim() === "" ? null : Number(v));

      const profile = await supabase.from("profiles").upsert({
        id: userId,
        full_name: form.fullName.trim(),
        headline: form.headline.trim() || null,
        about: form.about.trim() || null,
        city_slug: form.citySlug,
        domain_slugs: form.domainSlugs,
        current_role_title: form.roleTitle.trim() || null,
        current_company: form.company.trim() || null,
        skills: parseSkills(form.skillsText),
        linkedin_url: form.linkedinUrl.trim() || null,
        website_url: form.websiteUrl.trim() || null,
      });
      if (profile.error) throw profile.error;

      const details = await supabase
        .from("profile_details")
        .upsert({ user_id: userId, experience_years: num(form.experienceYears) });
      if (details.error) throw details.error;

      const recruiter = await supabase.from("profile_recruiter").upsert({
        user_id: userId,
        open_to_work: form.openToWork,
        notice_period_days: num(form.noticePeriodDays),
        expected_ctc_min_lpa: num(form.ctcMin),
        expected_ctc_max_lpa: num(form.ctcMax),
      });
      if (recruiter.error) throw recruiter.error;

      setStatus({ kind: "ok", text: "Profile saved." });
    } catch {
      setStatus({ kind: "error", text: "Could not save your profile. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-8" noValidate>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">About you</h2>
        <p className="text-sm text-muted">These details are visible to everyone.</p>
        <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
          <input id="fullName" className={inputClass} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </Field>
        <Field label="Headline" htmlFor="headline" error={errors.headline} hint="e.g. Product Manager at a Bangalore startup">
          <input id="headline" className={inputClass} value={form.headline} onChange={(e) => set("headline", e.target.value)} />
        </Field>
        <Field label="About" htmlFor="about" error={errors.about}>
          <textarea id="about" rows={4} className={inputClass} value={form.about} onChange={(e) => set("about", e.target.value)} />
        </Field>
        <Field label="City" htmlFor="city" error={errors.citySlug}>
          <select id="city" className={inputClass} value={form.citySlug} onChange={(e) => set("citySlug", e.target.value)}>
            <option value="">Choose your city</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Domains you are interested in</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {domains.map((d) => (
              <label key={d.slug} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.domainSlugs.includes(d.slug)} onChange={() => toggleDomain(d.slug)} />
                {d.name}
              </label>
            ))}
          </div>
          {errors.domainSlugs && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              {errors.domainSlugs}
            </p>
          )}
        </fieldset>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Work</h2>
        <Field label="Current role" htmlFor="role" error={errors.roleTitle}>
          <input id="role" className={inputClass} value={form.roleTitle} onChange={(e) => set("roleTitle", e.target.value)} />
        </Field>
        <Field label="Company" htmlFor="company" error={errors.company}>
          <input id="company" className={inputClass} value={form.company} onChange={(e) => set("company", e.target.value)} />
        </Field>
        <Field label="Total experience (years)" htmlFor="exp" error={errors.experienceYears} hint="Visible to logged-in members only.">
          <input id="exp" inputMode="numeric" className={inputClass} value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} />
        </Field>
        <Field label="Skills" htmlFor="skills" error={errors.skillsText} hint="Separate with commas.">
          <input id="skills" className={inputClass} value={form.skillsText} onChange={(e) => set("skillsText", e.target.value)} />
        </Field>
        <Field label="LinkedIn link" htmlFor="linkedin" error={errors.linkedinUrl}>
          <input id="linkedin" className={inputClass} placeholder="https://" value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} />
        </Field>
        <Field label="Website link" htmlFor="website" error={errors.websiteUrl}>
          <input id="website" className={inputClass} placeholder="https://" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} />
        </Field>
      </section>

      <section className="space-y-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-xl font-semibold">Job preferences (optional, private)</h2>
        <p className="text-sm text-muted">
          Only you can see this for now. In the future, verified recruiters on a paid plan may see it
          if you keep it switched on. You can switch it off or delete it at any time.
        </p>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.openToWork} onChange={(e) => set("openToWork", e.target.checked)} />
          I am open to work
        </label>
        <Field label="Notice period" htmlFor="notice" error={errors.noticePeriodDays}>
          <select id="notice" className={inputClass} value={form.noticePeriodDays} onChange={(e) => set("noticePeriodDays", e.target.value)}>
            <option value="">Prefer not to say</option>
            {NOTICE_PERIODS.map((n) => (
              <option key={n} value={String(n)}>
                {n === 0 ? "Immediate" : `${n} days`}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Expected CTC min (LPA)" htmlFor="ctcMin" error={errors.ctcMin}>
            <input id="ctcMin" inputMode="decimal" className={inputClass} value={form.ctcMin} onChange={(e) => set("ctcMin", e.target.value)} />
          </Field>
          <Field label="Expected CTC max (LPA)" htmlFor="ctcMax" error={errors.ctcMax}>
            <input id="ctcMax" inputMode="decimal" className={inputClass} value={form.ctcMax} onChange={(e) => set("ctcMax", e.target.value)} />
          </Field>
        </div>
      </section>

      {status && (
        <p
          role={status.kind === "error" ? "alert" : "status"}
          className={status.kind === "error" ? "text-sm text-red-600 dark:text-red-400" : "text-sm text-green-700 dark:text-green-400"}
        >
          {status.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-accent px-5 py-2.5 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
