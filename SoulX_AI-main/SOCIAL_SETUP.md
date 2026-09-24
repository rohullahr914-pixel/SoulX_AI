# SoulX social data setup

The migrations in `database/migrations/003_social.sql` and `005_admin_control.sql` create the social, challenge, XP, badge, shared-answer, aggregate-statistics, leaderboard, plan, and admin settings tables. They enable RLS on every table and keep challenge keys private. Account identity and sessions are provided by Supabase Auth.

Apply the SQL files in `database/migrations` through Supabase SQL Editor or the Supabase CLI in filename order.

The client uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Keep the publishable key in the browser-safe environment; never expose a Supabase service-role key. Configure Supabase Cron to call these SQL functions:

```sql
select refresh_social_stats();
select expire_plans();
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` only in the deployment server environment. Create the matching Supabase Auth account, then set its `profiles.role` to `admin` in a protected SQL session. The admin panel is at `/admin/login`.

The function writes cached weekly and all-time leaderboard rows. Weekly rows use the UTC Monday bucket and are never used to overwrite all-time rows. Public reads are limited by RLS to intentionally public profiles, Personas, challenges, leaderboard entries, and shared answers. Private chats and unshared answers are never inserted into `shared_answers`.
