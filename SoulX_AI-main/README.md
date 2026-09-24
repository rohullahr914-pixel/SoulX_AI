# SoulX

SoulX is a Next.js application backed by Supabase Auth and Postgres for accounts, profiles, conversations, messages, plans, usage, subscriptions, and community data.

## Local setup

1. Copy `.env.example` to `.env` and set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the browser.
3. Set the server-only `ADMIN_EMAIL` and `ADMIN_PASSWORD` values. The password is never bundled or returned to the browser; the matching Supabase Auth account must have `profiles.role = 'admin'`.
4. Run the SQL files in `database/migrations` in Supabase SQL Editor (or with the Supabase CLI) in filename order.
5. Install dependencies:

```bash
npm install
```

6. Start the application:

```bash
npm run dev -- -p 3000
```

The admin dashboard is available at `/admin/login` and `/admin` for the configured administrator. It includes user, Persona, plan, challenge, leaderboard, analytics, settings, subscription, usage, suspension, support search, and action log controls.

## Database

Migration files live in `database/migrations` and are applied in filename order through Supabase. `profiles.id` references `auth.users.id`; a database trigger creates a profile after registration.

The database contains normalized tables for:

- `profiles`: identity, role, plan, limits, and profile fields
- `conversations` and `messages`: private chat history
- `usage`: daily/monthly message accounting
- `payments`: future Stripe/PayPal-ready payment records
- `admin_logs`: immutable admin action history

Authentication uses Supabase Auth. Access and refresh tokens are stored in HttpOnly, SameSite cookies; passwords never enter SoulX tables. The service-role key is used only by server routes.

## Verification

```bash
npm run lint -- --quiet
npm run build
```

For production, set the Supabase environment variables in the hosting provider, apply migrations through Supabase, configure a Cron job for `select expire_plans(); select refresh_social_stats();`, and serve the site over HTTPS.
