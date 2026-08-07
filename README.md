# invoice-processing-app
Building a web application that processes Invoices from PDF and Image format into a structured table. 

## Deploy

Hosted on Vercel, deployed from `main`. The Vercel project needs these env vars
set for Production, Preview, and Development (see `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

After the first deploy, update Supabase's Authentication → URL Configuration
(Site URL + Redirect URLs) to include the production domain — otherwise sign-up
confirmation emails will link back to `localhost`.
