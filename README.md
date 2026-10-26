# City Circle

Curated, city-wise professional communities for India's metro cities (Delhi, Noida, Gurugram, Mumbai, Pune, Bangalore, Hyderabad, Chennai). Communities are created by the City Circle team only.

## Status: Phase 1 foundation
- Next.js + TypeScript + Tailwind, exported as a static site.
- 8 cities x 10 domains (80 communities), all on "opening soon" waitlist status.
- Data sits behind `CommunityRepository` (`src/modules/communities/`), so Supabase can replace the static data later without changing pages.
- No sign-up, login, posts or chat yet. Those come in later phases.

## Develop
```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # lint + type-check + tests + production build
```

Requires Node 20.9+ (`.nvmrc` pins 22).

## Deploy (GitHub Pages)
In the repo, go to Settings > Pages and set Source to **GitHub Actions**. Every push to `main` then builds and deploys. The base path is taken from the repo name, so renaming the repo needs no code change.

## Secrets
Never commit `.env` files. Copy `.env.example` to `.env.local` for local values.
