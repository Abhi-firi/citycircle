// Basic profile validation. Mirrors the CHECK constraints in
// supabase/migrations/20261027000000_profiles.sql. The database is the final
// authority; this gives friendly errors first.
//
// Job details (experience, skills, notice period, CTC) are deliberately NOT
// here. They belong to a separate "complete your profile" step added later.

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export function genderLabel(value: string): string {
  return GENDER_OPTIONS.find((g) => g.value === value)?.label ?? "";
}

/** What other members see instead of the gender itself, like LinkedIn. */
export function pronounsFor(value: string): string {
  if (value === "male") return "He/Him";
  if (value === "female") return "She/Her";
  if (value === "other") return "They/Them";
  return "";
}

export type ProfileInput = {
  fullName: string;
  /** "male", "female" or "other". Required. */
  gender: string;
  headline: string;
  citySlug: string;
  domainSlugs: string[];
  roleTitle: string;
  company: string;
};

export type ProfileErrors = Partial<Record<keyof ProfileInput, string>>;

export function validateProfile(
  input: ProfileInput,
  validCitySlugs: string[],
  validDomainSlugs: string[],
): ProfileErrors {
  const errors: ProfileErrors = {};

  const name = input.fullName.trim();
  if (name.length < 1) errors.fullName = "Enter your full name.";
  else if (name.length > 100)
    errors.fullName = "Name must be 100 characters or fewer.";

  if (!input.gender) errors.gender = "Choose your gender.";
  else if (!GENDER_OPTIONS.some((g) => g.value === input.gender))
    errors.gender = "Choose from the list.";

  if (input.headline.trim().length > 160)
    errors.headline = "Headline must be 160 characters or fewer.";

  if (!input.citySlug) errors.citySlug = "Choose your city.";
  else if (!validCitySlugs.includes(input.citySlug))
    errors.citySlug = "Choose a city from the list.";

  if (input.domainSlugs.length < 1)
    errors.domainSlugs = "Pick at least one domain.";
  else if (input.domainSlugs.length > 10)
    errors.domainSlugs = "Pick at most 10 domains.";
  else if (input.domainSlugs.some((d) => !validDomainSlugs.includes(d)))
    errors.domainSlugs = "Pick domains from the list.";

  if (input.roleTitle.trim().length > 100)
    errors.roleTitle = "Role must be 100 characters or fewer.";
  if (input.company.trim().length > 100)
    errors.company = "Company must be 100 characters or fewer.";

  return errors;
}

/** A profile counts as set up once it has a name, gender, a city and at least one domain. */
export function isProfileComplete(input: ProfileInput): boolean {
  return (
    input.fullName.trim() !== "" &&
    input.gender !== "" &&
    input.citySlug !== "" &&
    input.domainSlugs.length > 0
  );
}
