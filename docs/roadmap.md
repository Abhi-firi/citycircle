# CityCircle roadmap

Working plan agreed 28 Oct 2026. It follows the phases in the CityCircle PRD v1.0, in the order
that makes the most sense for launching with waitlists first. Sizes are relative effort, not dates:
**S** = one pull request, **M** = two to three, **L** = a series of them.

## Where we are
| Area | Status |
|---|---|
| Foundation: app, CI, GitHub Pages, Supabase, migrations, SQL security tests | Done |
| Sign-up, login, basic profile | Done |
| 8 cities x 10 domains, community pages, waitlist (opens at 100 members) | Done |
| Draft Terms, Privacy, Community Guidelines, sign-up consent | Done (draft, not lawyer-reviewed) |
| Brand tokens (teal palette) | Done |

## Build order
| # | Work | Size | Why now |
|---|---|---|---|
| 1 | **Look and feel pass 1**: font, hero, icons, cards, favicon, mobile polish | S | First impression for waitlist marketing |
| 2 | **Complete your profile** (4 steps): basics, photo and about, work and skills, job preferences (private) | M | Fills the data recruiters need later |
| 3 | **Logged-in home**: left menu, my communities, suggested communities, profile completion card (real data only) | M | Gives members a place to land |
| 4 | **Admin panel** (team only): see waitlists, open a community, manage users | M | Needed to actually open communities |
| 5 | **Posts and comments** inside open communities, chronological feed | L | The core of the product |
| 6 | **Follow and connect, notifications** | M | Networking |
| 7 | **Reporting, blocking, moderation queue** | M | Must exist before communities open to the public |
| 8 | **Chat** (text only) | L | After posts are stable; adds abuse risk |
| 9 | **Jobs and recruiter subscription** with filters (experience, role, city, CTC, notice period) and payments | L | First revenue |
| 10 | **Creator and brand campaigns**, sales lead filters, ads | L | Revenue after audience exists |

## Launch gates
**Start waitlist marketing (WhatsApp and LinkedIn) once:** step 1 and 2 are done, a lawyer has reviewed
the legal pages, the contact email is set, and custom email sending is in place (Supabase's built-in
email allows only a few messages per hour).

**Open a community to the public once:** steps 4, 5 and 7 are done and the community has its first
posts seeded by the team.

## Founder-side tasks (not code)
- Domain name (for example citycircle.in) and where it points.
- Final logo files and a support email.
- Lawyer review of Terms, Privacy and Guidelines (DPDP Act, IT Act intermediary rules).
- Custom email provider (SMTP) for sign-up emails.
- Seed plan: who writes the first posts and moderates each domain, and community leads.
- Move the repo to private and hosting to Vercel when ready (GitHub Pages needs a public repo on the free plan).
- Rotate the database password that was typed in chat, and update the `SUPABASE_DB_URL` secret.

## Before real scale
Error monitoring (Sentry), backups and a tested restore, a separate staging database, load tests,
account deletion in the app, and a security review of every access rule.

## Rules we follow
Small reviewed pull requests. No feature is called done without tests and manual verification.
Brand colours come only from the tokens in `src/app/globals.css`. Do not show numbers that are not real.
