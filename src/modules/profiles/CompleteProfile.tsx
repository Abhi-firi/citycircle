"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { AvatarUploader } from "./AvatarUploader";
import { Field, inputClass } from "@/modules/auth/Field";
import {
  EMPTY_EXTRAS,
  MAX_ABOUT,
  NOTICE_OPTIONS,
  completionPercent,
  completionSteps,
  parseNumber,
  parseSkills,
  validateAbout,
  validatePreferences,
  validateWork,
  type ExtrasErrors,
  type ProfileExtras,
  type StepId,
} from "./extras";

export async function loadExtras(userId: string): Promise<ProfileExtras> {
  const db = getSupabase();
  const [profile, details, recruiter] = await Promise.all([
    db
      .from("profiles")
      .select("about, skills, avatar_path")
      .eq("id", userId)
      .maybeSingle(),
    db
      .from("profile_details")
      .select("experience_years")
      .eq("user_id", userId)
      .maybeSingle(),
    db
      .from("profile_recruiter")
      .select(
        "open_to_work, notice_period_days, expected_ctc_min_lpa, expected_ctc_max_lpa",
      )
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (profile.error) throw profile.error;
  if (details.error) throw details.error;
  if (recruiter.error) throw recruiter.error;
  return {
    about: profile.data?.about ?? "",
    hasPhoto: !!profile.data?.avatar_path,
    skills: profile.data?.skills ?? [],
    experienceYears: details.data?.experience_years ?? null,
    openToWork: recruiter.data?.open_to_work ?? false,
    noticePeriodDays: recruiter.data?.notice_period_days ?? null,
    ctcMinLpa: recruiter.data?.expected_ctc_min_lpa ?? null,
    ctcMaxLpa: recruiter.data?.expected_ctc_max_lpa ?? null,
    prefsSaved: recruiter.data !== null,
  };
}

export function CompleteProfile({
  userId,
  name,
  avatarPath,
  onAvatarChange,
}: {
  userId: string;
  name: string;
  avatarPath: string | null;
  onAvatarChange: (path: string | null) => void;
}) {
  const [extras, setExtras] = useState<ProfileExtras | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<StepId | null>(null);

  useEffect(() => {
    let active = true;
    loadExtras(userId)
      .then((e) => active && setExtras(e))
      .catch((err) => {
        console.error("Could not load profile extras", err);
        if (active) {
          setExtras(EMPTY_EXTRAS);
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!extras) return null;
  const withPhoto: ProfileExtras = { ...extras, hasPhoto: avatarPath !== null };
  const steps = completionSteps(withPhoto);
  const percent = completionPercent(withPhoto);

  function saved(next: ProfileExtras) {
    setExtras(next);
    setOpen(null);
  }

  return (
    <section
      aria-label="Complete your profile"
      className="max-w-xl space-y-4 rounded-xl border border-line bg-surface p-6"
    >
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Complete your profile</h2>
          <span className="text-sm font-medium text-primary">{percent}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-mint"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completion"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-sm text-muted">
          Everything here is optional. A fuller profile helps people in your
          city find you.
        </p>
        {failed && (
          <p role="alert" className="text-sm text-red-600">
            Could not load your saved details, so some steps may look empty.
            Refresh before editing.
          </p>
        )}
      </div>

      <ol className="space-y-2">
        <li className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted">
          <Check aria-hidden="true" className="h-4 w-4 text-primary" />
          Basic details
        </li>
        {steps.map((s) => (
          <li key={s.id} className="rounded-lg border border-line">
            <button
              type="button"
              onClick={() => setOpen(open === s.id ? null : s.id)}
              aria-expanded={open === s.id}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium"
            >
              {s.done ? (
                <Check aria-hidden="true" className="h-4 w-4 text-primary" />
              ) : (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border border-line"
                />
              )}
              <span className="flex-1">{s.title}</span>
              <ChevronRight
                aria-hidden="true"
                className={`h-4 w-4 text-muted ${open === s.id ? "rotate-90" : ""}`}
              />
            </button>
            {open === s.id && (
              <div className="border-t border-line p-4">
                {s.id === "photo" && (
                  <AvatarUploader
                    userId={userId}
                    name={name}
                    path={avatarPath}
                    onChange={onAvatarChange}
                  />
                )}
                {s.id === "about" && (
                  <AboutStep userId={userId} extras={extras} onSaved={saved} />
                )}
                {s.id === "work" && (
                  <WorkStep userId={userId} extras={extras} onSaved={saved} />
                )}
                {s.id === "preferences" && (
                  <PreferencesStep
                    userId={userId}
                    extras={extras}
                    onSaved={saved}
                  />
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

type StepProps = {
  userId: string;
  extras: ProfileExtras;
  onSaved: (next: ProfileExtras) => void;
};

function useSaver() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function run(
    task: () => Promise<{ error: { code?: string } | null }[]>,
    onOk: () => void,
  ) {
    setBusy(true);
    setMessage(null);
    try {
      const results = await task();
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        console.error("Save failed", failed.error);
        setMessage(
          `Could not save. Please try again. (code: ${failed.error.code || "unknown"})`,
        );
      } else onOk();
    } catch (err) {
      console.error("Save failed", err);
      setMessage("Could not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, message, run };
}

function SaveRow({ busy, message }: { busy: boolean; message: string | null }) {
  return (
    <div className="space-y-2">
      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function AboutStep({ userId, extras, onSaved }: StepProps) {
  const [about, setAbout] = useState(extras.about);
  const [errors, setErrors] = useState<ExtrasErrors>({});
  const { busy, message, run } = useSaver();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateAbout(about);
    setErrors(found);
    if (Object.keys(found).length) return;
    void run(
      async () => [
        await getSupabase()
          .from("profiles")
          .update({ about: about.trim() || null })
          .eq("id", userId),
      ],
      () => onSaved({ ...extras, about: about.trim() }),
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field
        label="About you"
        htmlFor="about"
        error={errors.about}
        hint={`${about.length}/${MAX_ABOUT}`}
      >
        <textarea
          id="about"
          rows={5}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="What do you do, what are you building, what would you like from your city's community?"
          className={inputClass}
        />
      </Field>
      <SaveRow busy={busy} message={message} />
    </form>
  );
}

function WorkStep({ userId, extras, onSaved }: StepProps) {
  const [skillsText, setSkillsText] = useState(extras.skills.join(", "));
  const [years, setYears] = useState(
    extras.experienceYears === null ? "" : String(extras.experienceYears),
  );
  const [errors, setErrors] = useState<ExtrasErrors>({});
  const { busy, message, run } = useSaver();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const skills = parseSkills(skillsText);
    const experienceYears = parseNumber(years);
    const found = validateWork(skills, experienceYears);
    setErrors(found);
    if (Object.keys(found).length) return;
    void run(
      async () => {
        const db = getSupabase();
        const a = await db.from("profiles").update({ skills }).eq("id", userId);
        if (a.error) return [a];
        const b = await db
          .from("profile_details")
          .upsert({ user_id: userId, experience_years: experienceYears });
        return [b];
      },
      () => onSaved({ ...extras, skills, experienceYears }),
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field
        label="Years of experience"
        htmlFor="years"
        error={errors.experienceYears}
      >
        <input
          id="years"
          inputMode="numeric"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field
        label="Skills"
        htmlFor="skills"
        error={errors.skills}
        hint="Separate with commas, for example: B2B sales, Python, Fundraising"
      >
        <textarea
          id="skills"
          rows={3}
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          className={inputClass}
        />
      </Field>
      <SaveRow busy={busy} message={message} />
    </form>
  );
}

function PreferencesStep({ userId, extras, onSaved }: StepProps) {
  const [openToWork, setOpenToWork] = useState(extras.openToWork);
  const [notice, setNotice] = useState(
    extras.noticePeriodDays === null ? "" : String(extras.noticePeriodDays),
  );
  const [min, setMin] = useState(
    extras.ctcMinLpa === null ? "" : String(extras.ctcMinLpa),
  );
  const [max, setMax] = useState(
    extras.ctcMaxLpa === null ? "" : String(extras.ctcMaxLpa),
  );
  const [errors, setErrors] = useState<ExtrasErrors>({});
  const { busy, message, run } = useSaver();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const noticePeriodDays = notice === "" ? null : Number(notice);
    const ctcMinLpa = parseNumber(min);
    const ctcMaxLpa = parseNumber(max);
    const found = validatePreferences(noticePeriodDays, ctcMinLpa, ctcMaxLpa);
    setErrors(found);
    if (Object.keys(found).length) return;
    void run(
      async () => [
        await getSupabase().from("profile_recruiter").upsert({
          user_id: userId,
          open_to_work: openToWork,
          notice_period_days: noticePeriodDays,
          expected_ctc_min_lpa: ctcMinLpa,
          expected_ctc_max_lpa: ctcMaxLpa,
        }),
      ],
      () =>
        onSaved({
          ...extras,
          openToWork,
          noticePeriodDays,
          ctcMinLpa,
          ctcMaxLpa,
          prefsSaved: true,
        }),
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <p className="rounded-lg bg-pale px-3 py-2 text-sm">
        Only you can see this. It is not shown on your profile or to other
        members.
      </p>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={openToWork}
          onChange={(e) => setOpenToWork(e.target.checked)}
        />
        I am open to new job opportunities
      </label>
      <Field label="Notice period" htmlFor="notice">
        <select
          id="notice"
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          className={inputClass}
        >
          <option value="">Prefer not to say</option>
          {NOTICE_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d === 0 ? "Immediate" : `${d} days`}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Expected pay, min (LPA)"
          htmlFor="ctc-min"
          error={errors.ctc}
        >
          <input
            id="ctc-min"
            inputMode="decimal"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Expected pay, max (LPA)" htmlFor="ctc-max">
          <input
            id="ctc-max"
            inputMode="decimal"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <SaveRow busy={busy} message={message} />
    </form>
  );
}
