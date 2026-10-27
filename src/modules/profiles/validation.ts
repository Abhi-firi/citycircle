// Mirrors the CHECK constraints in supabase/migrations/20261027000000_profiles.sql.
// The database is the final authority; this gives users friendly errors first.

export const NOTICE_PERIODS = [0, 15, 30, 60, 90] as const;

export type ProfileInput = {
  fullName: string;
  headline: string;
  about: string;
  citySlug: string;
  domainSlugs: string[];
  roleTitle: string;
  company: string;
  experienceYears: string;
  skillsText: string;
  linkedinUrl: string;
  websiteUrl: string;
  openToWork: boolean;
  noticePeriodDays: string;
  ctcMin: string;
  ctcMax: string;
};

export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

export function parseSkills(text: string): string[] {
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const part of text.split(",")) {
    const skill = part.trim();
    const key = skill.toLowerCase();
    if (skill && !seen.has(key)) {
      seen.add(key);
      skills.push(skill);
    }
  }
  return skills;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function validateProfile(
  input: ProfileInput,
  validCitySlugs: string[],
  validDomainSlugs: string[],
): ProfileErrors {
  const errors: ProfileErrors = {};

  const name = input.fullName.trim();
  if (name.length < 1) errors.fullName = "Enter your full name.";
  else if (name.length > 100) errors.fullName = "Name must be 100 characters or fewer.";

  if (input.headline.trim().length > 160) errors.headline = "Headline must be 160 characters or fewer.";
  if (input.about.trim().length > 2000) errors.about = "About must be 2000 characters or fewer.";

  if (!input.citySlug) errors.citySlug = "Choose your city.";
  else if (!validCitySlugs.includes(input.citySlug)) errors.citySlug = "Choose a city from the list.";

  if (input.domainSlugs.length < 1) errors.domainSlugs = "Pick at least one domain.";
  else if (input.domainSlugs.length > 10) errors.domainSlugs = "Pick at most 10 domains.";
  else if (input.domainSlugs.some((d) => !validDomainSlugs.includes(d)))
    errors.domainSlugs = "Pick domains from the list.";

  if (input.roleTitle.trim().length > 100) errors.roleTitle = "Role must be 100 characters or fewer.";
  if (input.company.trim().length > 100) errors.company = "Company must be 100 characters or fewer.";

  const years = parseNumber(input.experienceYears);
  if (years !== null && (!Number.isInteger(years) || years < 0 || years > 60))
    errors.experienceYears = "Enter whole years between 0 and 60.";

  const skills = parseSkills(input.skillsText);
  if (skills.length > 30) errors.skillsText = "Add at most 30 skills.";
  else if (skills.some((s) => s.length > 40)) errors.skillsText = "Each skill must be 40 characters or fewer.";

  for (const field of ["linkedinUrl", "websiteUrl"] as const) {
    const value = input[field].trim();
    if (value && (value.length > 300 || !isHttpsUrl(value)))
      errors[field] = "Enter a full link starting with https://";
  }

  if (input.noticePeriodDays !== "") {
    const n = Number(input.noticePeriodDays);
    if (!(NOTICE_PERIODS as readonly number[]).includes(n))
      errors.noticePeriodDays = "Choose a notice period from the list.";
  }

  const min = parseNumber(input.ctcMin);
  const max = parseNumber(input.ctcMax);
  if (min !== null && (Number.isNaN(min) || min < 0)) errors.ctcMin = "Enter a number of 0 or more.";
  if (max !== null && (Number.isNaN(max) || max < 0)) errors.ctcMax = "Enter a number of 0 or more.";
  if (!errors.ctcMin && !errors.ctcMax && min !== null && max !== null && max < min)
    errors.ctcMax = "Maximum must be at least the minimum.";

  return errors;
}
