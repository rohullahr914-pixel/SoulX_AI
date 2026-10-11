# SoulX authentication provider setup

SoulX uses the existing Supabase Auth project. No provider button is simulated; each button starts a real Supabase OAuth flow and returns through `/auth/callback`.

## Required Supabase URL configuration

In **Supabase Dashboard → Authentication → URL Configuration**:

- Set the production Site URL to `https://soulxai.tech`.
- Add `https://soulxai.tech/auth/callback` to Redirect URLs.
- Add `http://localhost:3000/auth/callback` for local development.
- Keep email confirmation enabled for production. Email/password signup now waits for confirmation instead of using the service-role API to auto-confirm users.

## Google

Create an OAuth web client in Google Cloud, enable the Google provider in Supabase, and enter the client ID and secret there. Add the Supabase callback URL shown on the provider page to Google's authorized redirect URIs.

## Apple

Create a Services ID and Sign in with Apple key in Apple Developer, then configure the Apple provider in Supabase with those credentials. Add the Supabase callback URL as Apple's return URL. Apple requires an HTTPS production domain.

## GitHub

Create a GitHub OAuth App, enable the GitHub provider in Supabase, and enter its client ID and secret. Use the Supabase callback URL shown on the provider page as the GitHub authorization callback URL.

Provider secrets belong only in the Supabase dashboard. Do not place them in `NEXT_PUBLIC_*` variables or client code.

## Database migration

Apply `database/migrations/020_identity_profile_2.sql` after the existing migrations. It only adds optional profile fields and preserves existing users, relationships, subscriptions, conversations, personas, and ownership policies.
