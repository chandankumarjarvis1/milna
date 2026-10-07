# Milna MVP setup

Stack: Next.js 14 (App Router) + Supabase (Auth, Postgres, Realtime, Storage).

## 1. Supabase project
1. Create a project at supabase.com.
2. SQL editor: paste and run `supabase/schema.sql` once.
3. Authentication > URL Configuration: set Site URL to your domain (or http://localhost:3000 for dev) and add `<site>/auth/callback` to Redirect URLs.
4. Authentication > Providers: keep Email on (magic link). For production, add custom SMTP, the default Supabase mailer is rate limited.
5. Settings > API: copy Project URL and anon key.

When creating the project, turn **off** "Automatically expose new tables". `schema.sql` grants access table by table, so nothing needs the default. Keep "Enable Data API" on. Pick the Mumbai region for Patna users.

`schema.sql` is meant to be run once on a fresh project. Running it a second time fails on the policies and duplicates the seed rows.

## 2. Run locally
```
npm install
cp .env.local.example .env.local   # fill in the two values, in .env.local (not the example file)
npm run dev
```
Use the `anon` key only. Never put the `service_role` key in this project. `.env.local` is gitignored; keep it that way.

## Email limits (read this before testing with several accounts)
Supabase's built-in mailer allows only a few magic-link emails per hour for the whole project. You will hit "email rate limit exceeded" quickly. Fix it with custom SMTP: Authentication > Emails > SMTP Settings. For testing, Gmail works (smtp.gmail.com, port 465, a Gmail app password). For production use a transactional provider such as Resend or Brevo. Then raise the limit under Authentication > Rate Limits.

Open the magic link in the same browser you requested it from, otherwise it shows "link expired".

To test chat and meets you need two accounts: use a second browser profile or an incognito window, and a second email (a Gmail `+alias` works).

## 3. Before you invite anyone
- Table `cafes`: delete the 3 sample rows, add your real partner cafes (name, area, address, opens, closes, tags).
- Table `invite_codes`: delete `MILNA-DEMO`, create your own codes. One code per person (`max_uses` 1) or one per community (`max_uses` 20).
- Table `reports`: check it daily. Set `profiles.status` to `banned` to remove someone.
- Table `profile_private`: gender lives here, owner-only. Use the dashboard to track the women ratio.

## 4. How the gates work
- Signup creates a `pending` profile. Only a valid invite code (via `redeem_invite`) makes it `approved`.
- Users cannot edit `status` (column-level grants).
- Chat and meets are limited to accepted connections. Blocked pairs disappear from each other.
- Plan a meet unlocks only after both people have sent a message (enforced in RLS, not just the UI).
- Cafe counts come from `cafe_stats()`: confirmed meets in the next 7 days, no names.

## 5. Not in this version
Travel mode, separate Meet section, live presence, push notifications, payments, phone verification. The schema is ready for travel mode (add a `trips` table).
