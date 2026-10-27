# Profile fields (draft for approval)

Status: DRAFT. Founder approves before Phase 2 is built.

Goal: a LinkedIn-style professional profile that also powers the later recruitment filters
(experience, role, city, CTC, notice period) without collecting more than needed.

## Visibility levels
- **Public**: anyone can see (even logged out).
- **Members**: logged-in members only.
- **Recruiters only**: visible only to paying recruiters, and only if the member opts in.
- **Private**: only the member and admins.

## Fields

| Field | Required | Visibility | Notes |
|---|---|---|---|
| Full name | Yes | Public | |
| Profile photo | No | Public | Image upload, size and type validated |
| Headline | Yes | Public | e.g. "Product Manager at X" |
| About | No | Public | Max length enforced |
| Primary city | Yes | Public | One of the 8 cities; change allowed with a cooldown |
| Domains of interest | Yes | Public | Picks the communities to suggest |
| Current role and company | Yes | Public | |
| Total experience (years) | Yes | Members | Needed for recruiter filters |
| Skills | No | Public | Up to a fixed limit |
| Work history | No | Public | Company, title, dates |
| Education | No | Public | |
| Links (LinkedIn, website) | No | Public | |
| Open to work | No | Recruiters only (opt-in) | On/off switch |
| Notice period | No | Recruiters only (opt-in) | Immediate, 15, 30, 60, 90 days |
| Expected CTC range | No | Recruiters only (opt-in) | Range in LPA, never public |
| Current CTC | No | Private | Not collected in v1 (privacy risk) |
| Email | Yes | Private | Used for login and notices |
| Phone | No | Private | Not collected in v1 (no paid SMS) |

## Rules
- Notice period, expected CTC and open-to-work are **off by default**. The member turns them on
  and can turn them off at any time (consent under India's DPDP Act).
- Recruiters see them only on a paid plan, and every view is logged.
- Members can delete their account and data from settings.
- Public profiles show no email or phone.

## Open decisions for the founder
1. Is "Current CTC" really not needed? (Recommended: skip it, expected CTC is enough.)
2. Should "Total experience" be public or members-only? (Recommended: members-only.)
3. Verified badge for investors and builders: how will we verify (LinkedIn link, company email, manual check)?
