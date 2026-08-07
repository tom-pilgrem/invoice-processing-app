# Invoice Processor

A single-user-per-account web app for uploading invoices (PDF/image), extracting
structured data via the Anthropic API, and browsing/filtering/exporting that data
to Excel. Desktop-first internal ops tool. Rebuild of a prior Make.com automation
and Fabric pipeline as a persistent, multi-tenant (each account fully isolated) web app.

Tone: clean, precise, data-tool aesthetic — not playful, not a consumer app.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Row Level Security) — `@supabase/ssr` for server/client auth
- Anthropic API (Claude, forced tool use) for invoice extraction
- SheetJS (`xlsx`) for generating Excel exports (two-sheet workbook)
- Vercel for deployment

## Data model

Extended from the original brief to match the design mockups and the proven
extraction prompt (see "Extraction" below) — richer than the brief's minimal
version, since the design's expanded line-item panel (ABN, vendor email,
product code, service date, discount %) and Browse table (invoice #, due
date, per-invoice currency) both assume these fields exist.

```sql
create table invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  vendor text,
  abn text,
  vendor_email text,
  vendor_phone text,
  invoice_number text,
  invoice_date date,              -- nullable; not editable after the upload review step
  due_date date,
  subtotal numeric,
  gst numeric,
  total_amount numeric,
  currency text,                  -- ISO code (AUD/USD/NZD/...), inferred by Claude; nullable
  source_filename text,
  needs_review boolean default false,
  created_at timestamp default now()  -- doubles as "upload date" for filtering
);

create table invoice_line_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references invoices not null,
  user_id uuid references auth.users not null,
  product_code text,
  product_name text,
  service_date date,
  quantity numeric,
  list_price numeric,
  discount_pct numeric,
  net_total numeric,
  created_at timestamp default now()
);

alter table invoices enable row level security;
alter table invoice_line_items enable row level security;

create policy "own invoices" on invoices
  for all using (auth.uid() = user_id);
create policy "own line items" on invoice_line_items
  for all using (auth.uid() = user_id);
```

Original uploaded files are **not** stored — extracted and discarded. No storage
bucket, no `file_url` column.

`billing_period` (YYYY-MM) from the original extraction prompt is dropped —
superseded by day-precision `invoice_date`, nothing downstream needs month-only.

## Core flows

1. **Upload** — batch drag/drop of PDF/image → Next.js API route (keeps Anthropic
   key server-side) → Claude forced tool-use extraction (see "Extraction" below).
   Invoices with a found date insert straight through. Invoices without a date
   are held for the review step. Relative/non-absolute dates ("net 30 from
   receipt") count as "no date found."
2. **Missing-date review** — end-of-batch screen only (never per-invoice, never
   later): "X of Y processed automatically. Z need your input." One row per
   flagged file with filename + detected vendor + date picker + skip. Single
   batch "Confirm and save." Filled → `invoice_date` set, `needs_review = false`.
   Skipped → `invoice_date` null, `needs_review = true`. This is the only point
   `invoice_date` can ever be set for a Claude-missed invoice.
3. **Browse/search/filter** — table of invoices, row expands (accordion) to line
   items. Filters: date type toggle (invoice date default / upload date), date
   range, vendor search, invoice number search, needs-review toggle. Query
   Supabase directly (not client-side filtering) once data grows.
4. **Export** — respects whatever filter/search is currently active. Two-sheet
   `.xlsx`: line items (flattened) + invoice metadata. Generated on demand, not
   persisted. Confirmation modal states exactly what's being exported before
   download.

## Extraction (Claude)
- Model: **`claude-haiku-4-5-20251001`** (Haiku 4.5).
- Forced tool use (a tool-use call, not free-text JSON) — the brief calls for
  forced tool use, and it's more reliable than parsing a JSON string out of a
  text response. The tool's input schema is derived directly from the
  previously-proven extraction prompt below, extended with three fields the
  old pipeline didn't need but this app does: `invoice_number`, day-precision
  `invoice_date`, and `currency`.
- System prompt and field-level rules carry over from the prior
  Make.com/Fabric pipeline's prompt (proven in production), including the
  product-code OCR-reconstruction rule (recombine a split prefix/number pair
  like "CAT" + "001" → "CAT001" using surrounding context) and the
  null-for-missing-fields convention.
- New rules for the added fields:
  - `invoice_date`: the invoice's issue/date-issued field, `YYYY-MM-DD`. A
    relative term ("net 30 from receipt") or no date present → `null` (drives
    `needs_review`, same as the brief's original date-missing logic).
  - `currency`: 3-letter ISO code (AUD/USD/NZD/...) inferred from symbols/text
    on the invoice ($, A$, US$, etc). `null` if genuinely ambiguous — Browse
    groups these under an "unknown currency" bucket rather than guessing.
  - `invoice_number`: as printed on the invoice; `null` if absent.
- PDFs are sent as a `document` content block (Claude reads PDFs natively, no
  separate OCR/rasterization step needed); images (`jpg`/`png`) as an `image`
  content block.
- Test fixtures: `/Users/tompilgrem/Downloads/Invoices/` — 7 sample PDFs plus
  jpg/png versions of several of them in `images/`, useful for exercising both
  the PDF and image code paths and validating the OCR product-code
  reconstruction rule.

## Auth
Supabase Auth, email/password. Every table scoped to `auth.uid()` via RLS — this
is what makes "each account is its own private invoice store" work with no
app-level filtering logic. Server routes that write on a user's behalf should run
with the user's session (via `@supabase/ssr`), not a service-role key, so RLS is
always the enforcement point — avoid introducing a service-role key unless a
specific route genuinely needs to bypass RLS.

## Out of scope for v1
- Editing `invoice_date` after the upload-time review step (locked).
- Editing any other extracted field after save (line items, vendor, etc.).
- Persisting generated export files (regenerate on demand instead).
- Multi-currency conversion/normalization (store `currency` as extracted, no math).
- Storing original uploaded files.
- Multi-user/team collaboration within one account — each account is single-tenant.

## Search scope (Browse)
Vendor search **and** invoice number search — two fields, per the project brief.
The design mockup only shows a vendor field; add invoice number alongside it,
matching visual style.

## Design system — "Modernist" (design/design_handoff/ has the full handoff + prototype)
- Colors: background `#f3f2f2`, surface (inputs) `#eae9e9`, text `#201e1d`, single
  accent `#ec3013` (no secondary hue), divider `color-mix(in srgb, #201e1d 40%, transparent)`.
  100–900 OKLCH tonal ramp per role; 100–300 for tints/hover, 500 base, 700–900 for
  text-on-tint/pressed.
- Typography: Archivo, heading weight 800. Base UI text 14px, table headers/labels
  11px uppercase with 0.08–0.1em letter-spacing, H1s 24px.
- Spacing scale: 4/8/12/16/24/32px.
- Radius: **0px everywhere** — no rounded corners.
- Shadows: sm `0 1px 2px rgba(45,43,43,.14)`, md `0 3px 10px rgba(45,43,43,.16)`,
  lg `0 12px 32px rgba(45,43,43,.22)`.
- Borders: 2px solid divider for major separators (nav, table header, sidebar
  divider), 1px for minor row rules.
- Buttons: primary = solid accent fill; secondary = outlined divider color;
  ghost = accent text, no fill. Labels flush-left, never centered.
- Tags: accent tag = accent-100 bg / accent-800 text; neutral tag = neutral-100
  bg / neutral-800 text.

**Working agreement**: follow this system closely. If a specific spot seems like it'd
work meaningfully better with a small deviation, flag it and ask before implementing
the deviation — don't silently change it and don't just build the alternative on spec.

## Env vars
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```
Kept in `.env.local` (gitignored). Do not paste actual key values into chat/commits —
fill `.env.local` directly once it's scaffolded.

## Build order
1. Scaffold Next.js + TypeScript + Tailwind, base layout/nav, Archivo font, design tokens.
2. Supabase project schema + RLS policies; wire up auth (sign up/in) with `@supabase/ssr`.
3. Upload UI + API route calling Claude with the invoice extraction tool schema;
   insert straight-through invoices.
4. Missing-date review screen + batch confirm/save.
5. Browse/search/filter screen against Supabase (server-side filtering).
6. Export (SheetJS, two-sheet workbook) wired to current filter state.
7. Deploy to Vercel, add env vars.

## Notes / edge cases carried forward
- Relative dates ("net 30 from receipt") → treat as "no date found," goes to review.
- Flag (don't silently guess) if Claude over-infers other fields with low confidence.
