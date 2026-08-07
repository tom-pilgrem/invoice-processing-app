# invoice-processing-app

A single-user-per-account web app for uploading invoices (PDF/image), extracting
structured data via the Anthropic API, and browsing/filtering/exporting that data
to Excel. Desktop-first internal ops tool, deployed and in use.

Full product/technical spec lives in [CLAUDE.md](CLAUDE.md) — data model, extraction
prompt rules, design system, and build history.

Project built using Claude Code and Claude Design.

## Status

All build stages are complete and deployed:
upload & extraction → missing-date review → browse/search/filter → Excel export → live on Vercel.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Row Level Security) via `@supabase/ssr`
- Anthropic API (Claude Haiku 4.5, forced tool use) for invoice extraction
- SheetJS (`xlsx`) for two-sheet Excel exports
- Vercel for deployment

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in the three values below
npm run dev
```

Required env vars (`.env.local`, gitignored — never commit real values):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

Database schema and RLS policies are in `supabase/migrations/` — apply them to
your Supabase project's SQL Editor in order (`0001_init.sql`, then
`0002_browse_summary.sql`) before running the app against it.

Other scripts:

```bash
npm run build   # production build
npm run lint    # eslint
```

## Deploy

Hosted on Vercel, deployed from `main`. The Vercel project needs the same three
env vars above set for Production, Preview, and Development.

After the first deploy (or if the production domain ever changes), update
Supabase's Authentication → URL Configuration (Site URL + Redirect URLs) to
include the production domain — otherwise sign-up confirmation emails will link
back to `localhost`.
