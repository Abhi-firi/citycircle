/** Optional "complete your profile" data, collected after the basic details. */
export type ProfileExtras = {
  about: string;
  skills: string[];
  experienceYears: number | null;
  openToWork: boolean;
  noticePeriodDays: number | null;
  ctcMinLpa: number | null;
  ctcMaxLpa: number | null;
  /** True once the member has saved the job-preferences step (even with nothing shared). */
  prefsSaved: boolean;
};

export const EMPTY_EXTRAS: ProfileExtras = {
  about: "",
  skills: [],
  experienceYears: null,
  openToWork: false,
  noticePeriodDays: null,
  ctcMinLpa: null,
  ctcMaxLpa: null,
  prefsSaved: false,
};

export const NOTICE_OPTIONS = [0, 15, 30, 60, 90] as const;
export const MAX_ABOUT = 2000;
export const MAX_SKILLS = 30;
export const MAX_SKILL_LENGTH = 40;

export type StepId = "about" | "work" | "preferences";

export type StepStatus = { id: StepId; title: string; done: boolean };

export function completionSteps(extras: ProfileExtras): StepStatus[] {
  return [
    {
      id: "about",
      title: "Write a short intro about you",
      done: extras.about.trim().length > 0,
    },
    {
      id: "work",
      title: "Work experience and skills",
      done: extras.skills.length > 0 && extras.experienceYears !== null,
    },
    {
      id: "preferences",
      title: "Job preferences (private)",
      done: extras.prefsSaved,
    },
  ];
}

/** Share of the 4 steps done. Step 1 (basic details) is always complete once we get here. */
export function completionPercent(extras: ProfileExtras): number {
  const done = completionSteps(extras).filter((s) => s.done).length;
  return Math.round(((done + 1) / 4) * 100);
}

export function parseSkills(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[,\n]/)) {
    const skill = raw.trim().replace(/\s+/g, " ");
    const key = skill.toLowerCase();
    if (skill && !seen.has(key)) {
      seen.add(key);
      out.push(skill);
    }
  }
  return out;
}

export type ExtrasErrors = Partial<
  Record<"about" | "skills" | "experienceYears" | "ctc", string>
>;

export function validateAbout(about: string): ExtrasErrors {
  return about.length > MAX_ABOUT
    ? { about: `Keep this under ${MAX_ABOUT} characters.` }
    : {};
}

export function validateWork(
  skills: string[],
  experienceYears: number | null,
): ExtrasErrors {
  const errors: ExtrasErrors = {};
  if (skills.length > MAX_SKILLS)
    errors.skills = `Add at most ${MAX_SKILLS} skills.`;
  else if (skills.some((s) => s.length > MAX_SKILL_LENGTH))
    errors.skills = `Each skill must be under ${MAX_SKILL_LENGTH} characters.`;
  if (
    experienceYears !== null &&
    (!Number.isInteger(experienceYears) ||
      experienceYears < 0 ||
      experienceYears > 60)
  )
    errors.experienceYears = "Enter whole years between 0 and 60.";
  return errors;
}

export function validatePreferences(
  noticePeriodDays: number | null,
  min: number | null,
  max: number | null,
): ExtrasErrors {
  const errors: ExtrasErrors = {};
  const bad = (n: number | null) =>
    n !== null && (!Number.isFinite(n) || n < 0 || n > 9999);
  if (bad(min) || bad(max))
    errors.ctc = "Enter a pay figure in lakhs per year, between 0 and 9999.";
  else if (min !== null && max !== null && max < min)
    errors.ctc = "Maximum must be at least the minimum.";
  if (
    noticePeriodDays !== null &&
    !(NOTICE_OPTIONS as readonly number[]).includes(noticePeriodDays)
  )
    errors.ctc = errors.ctc ?? "Choose a notice period from the list.";
  return errors;
}

/** Empty or non-numeric text becomes null. */
export function parseNumber(text: string): number | null {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isNaN(n) ? NaN : n;
}
