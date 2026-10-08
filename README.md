# Big Foods

Food marketplace for Nigeria: restaurants and home cooks sell, riders deliver, customers order once or subscribe.

## Stack
Next.js 13 (App Router), TypeScript, Tailwind, shadcn/ui, Supabase (Postgres, Auth, Edge Functions), Paystack (payments), Resend (email), Netlify (hosting).

## Setup
```bash
npm install
cp .env.example .env.local   # fill in Supabase URL and anon key
npm run dev
```
Checks: `npm run lint` and `npm run typecheck`.

## Layout
- `app/` routes: admin, restaurant-portal, rider-portal, order, track, search, blogs, api
- `components/`, `hooks/`, `lib/` shared code
- `supabase/migrations/` database schema
- `docs/` map setup and product vision

## Conventions
No secrets in git. Work on a branch and open a PR; never push to `main`.
