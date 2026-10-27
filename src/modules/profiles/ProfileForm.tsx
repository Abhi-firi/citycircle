"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { Field, inputClass } from "@/modules/auth/Field";
import { communityRepository as repo } from "@/modules/communities/repository";
import { validateProfile, type ProfileErrors, type ProfileInput } from "./validation";

export function ProfileForm({
  userId,
  initial,
  onSaved,
  onCancel,
}: {
  userId: string;
  initial: ProfileInput;
  onSaved: (saved: ProfileInput) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<ProfileInput>(initial);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [message, setMessage] = useState<string | null>(null);
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
    setMessage(null);

    const found = validateProfile(
      form,
      cities.map((c) => c.slug),
      domains.map((d) => d.slug),
    );
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setMessage("Please fix the highlighted fields.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await getSupabase()
        .from("profiles")
        .upsert({
          id: userId,
          full_name: form.fullName.trim(),
          headline: form.headline.trim() || null,
          city_slug: form.citySlug,
          domain_slugs: form.domainSlugs,
          current_role_title: form.roleTitle.trim() || null,
          current_company: form.company.trim() || null,
        });
      if (error) {
        console.error("Profile save failed", error);
        // The code (not the message) helps support find the cause without leaking details.
        setMessage(`Could not save your profile. Please try again. (code: ${error.code || "unknown"})`);
        return;
      }
      onSaved({
        ...form,
        fullName: form.fullName.trim(),
        headline: form.headline.trim(),
        roleTitle: form.roleTitle.trim(),
        company: form.company.trim(),
      });
    } catch (err) {
      console.error("Profile save failed", err);
      setMessage("Could not save your profile. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5" noValidate>
      <Field label="Full name" htmlFor="fullName" error={errors.fullName}>
        <input id="fullName" className={inputClass} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" />
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
          <p role="alert" className="text-xs text-red-600">
            {errors.domainSlugs}
          </p>
        )}
      </fieldset>
      <Field label="Current role (optional)" htmlFor="role" error={errors.roleTitle}>
        <input id="role" className={inputClass} value={form.roleTitle} onChange={(e) => set("roleTitle", e.target.value)} />
      </Field>
      <Field label="Company (optional)" htmlFor="company" error={errors.company}>
        <input id="company" className={inputClass} value={form.company} onChange={(e) => set("company", e.target.value)} />
      </Field>
      <Field label="Headline (optional)" htmlFor="headline" error={errors.headline} hint="e.g. Product Manager at a Bangalore startup">
        <input id="headline" className={inputClass} value={form.headline} onChange={(e) => set("headline", e.target.value)} />
      </Field>

      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-5 py-2.5 font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Saving..." : "Save profile"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-line px-5 py-2.5 font-medium hover:border-primary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
