# Portfolio

The portfolio site for the projects in GitHub account `kulkarnishreyas87-boop`, built to the components map in
[`docs/component-map.html`](docs/component-map.html).

```
Visitor ─▶ Next.js pages (ISR, 1 h) ─▶ Neon (published rows only)
ContactForm ─▶ /api/contact ─▶ Neon contact_messages ─▶ Resend email to me
Vercel Cron (02:00 UTC) or "Sync now" ─▶ /api/sync ─▶ GitHub API ─▶ Neon repo facts
                                                   └▶ README changed? Gemini draft ─▶ /admin review ─▶ publish
```

- **Neon is the single source.** The public site never calls GitHub or Gemini while a visitor waits.
- **Gemini drafts, I publish.** A changed README produces a draft in `drafts`; nothing goes live until it is approved in `/admin`.
- **Hand edits win.** Every field saved in `/admin` is recorded in `projects.edited_fields`, and the sync never overwrites those.
- **New repos arrive hidden**, so nothing appears on the site without a review.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: without DATABASE_URL the dev server uses an in-memory Postgres seeded with the six projects
npm run dev                  # http://localhost:3070
npm test                     # 29 tests on an in-memory Postgres (PGlite), no keys needed
```

With Neon:

```bash
npm run migrate              # creates the schema and tables (safe to repeat)
npm run seed                 # loads the six projects; never touches a project that already exists
npm run sync                 # one GitHub sync from the terminal (-- --no-drafts to skip Gemini)
```

`DB_SCHEMA` keeps environments apart: production defaults to `portfolio`, everything else to `portfolio_dev`.

## Pages

| Route | What it shows |
|---|---|
| `/` | Hero, featured project, project grid, stack by category, contact form |
| `/projects` | All projects with a technology filter (`?tech=Gemini` is shareable) |
| `/projects/[slug]` | Case study, highlights, components map, screens, links, stack and languages |
| `/about` | Bio, projects by last commit, skills |
| `/admin` | Projects (edit, publish, feature, order, media), Gemini drafts, messages, GitHub sync |

Edit who the site is about in [`data/profile.ts`](data/profile.ts) (LinkedIn and CV links are hidden until filled in).
Screenshots live in `public/screenshots/`; add one in `/admin` as `/screenshots/name.png`. The first screenshot becomes the card cover.

## Neon tables

`projects`, `technologies`, `project_technologies`, `highlights`, `media`, `repo_snapshots`, `drafts`, `contact_messages`,
`sync_runs`, plus `rate_limits` (contact form: 5 per hour per address; admin login: 6 tries per 15 minutes).
Schema: [`lib/db/schema.ts`](lib/db/schema.ts).

## Deploy on Vercel

1. Import the `portfolio` folder as a Vercel project (or push it to its own repo first).
2. Add the environment variables from `.env.example`. For production, set `DB_SCHEMA=portfolio`, a fresh
   `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` and `CRON_SECRET`, a `GITHUB_TOKEN` (read-only; unauthenticated GitHub allows
   only 60 requests an hour, and one sync uses about 30), and `RESEND_API_KEY` with `CONTACT_TO`.
3. Run `npm run migrate` and `npm run seed` once against the production schema (`DB_SCHEMA=portfolio`).
4. Deploy. `vercel.json` schedules the daily sync at 02:00 UTC.

Without `RESEND_API_KEY`/`CONTACT_TO`, messages are still saved and shown in `/admin/messages`.
Without `GEMINI_API_KEY`, the sync still runs and skips drafting.
