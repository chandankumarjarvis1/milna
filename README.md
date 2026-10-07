# Milna

**Less scrolling. More meeting.**

Milna is an invite-only web app for people in Patna who are building something. You find someone interesting, say hello, and then pick a public cafe and meet in real life. Chat exists only to get you to the table.

This is an early MVP (v0.1). It is built to launch small: one city, invite codes, a handful of partner cafes.

## How it works

1. **Join with an invite code.** Sign in with an email magic link, build a profile (photo, what you do, interests, what you are open to), and redeem an invite code. Until then your profile stays `pending` and is invisible to everyone.
2. **Explore.** Browse approved people in your city, filter by what they are open to (coffee, networking, business...), and send a connect request.
3. **Talk.** The other person accepts or declines. Accepted connections get a realtime chat.
4. **Plan a meet.** This unlocks only after *both* people have sent at least one message. Pick a partner cafe, a date and a time. The other person confirms or declines, and the meet shows up as a ticket.
5. **Cafes.** The list of partner cafes, with anonymous counts of confirmed meets this week (never names).

Safety tools: block (with an unblock list under *Me*), report from any chat, and a `banned` status you control from the Supabase dashboard.

## Stack

- [Next.js 14](https://nextjs.org) (App Router) and TypeScript
- Tailwind CSS
- [Supabase](https://supabase.com): Auth (email magic link), Postgres with Row Level Security, Realtime (chat and meet updates), Storage (profile photos)

There is no custom backend. The browser talks to Supabase directly, and **the database enforces the rules**, not the UI.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # then fill in your Supabase URL and anon key
npm run dev                        # http://localhost:3000
```

Before it works you need a Supabase project with [`supabase/schema.sql`](supabase/schema.sql) applied. The full walkthrough, including auth redirect URLs and email setup, is in **[SETUP.md](SETUP.md)**.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

## Project layout

```
app/
  page.tsx               landing page
  login/                 magic link sign-in
  auth/callback/         exchanges the magic link code for a session
  onboarding/            profile creation and invite gate
  (app)/                 signed-in area, guarded by an approved profile
    explore/  talk/  talk/[id]/  meet/new/  cafes/  me/
components/              ChatThread, ExploreList, MeetForm, ProfileForm, BlockedList, ...
lib/                     Supabase clients (browser and server), types, constants, formatting
middleware.ts            refreshes the session, redirects logged-out users to /login
supabase/schema.sql      tables, RLS policies, functions, storage bucket, seed data
```

## Security model

All of this lives in [`supabase/schema.sql`](supabase/schema.sql):

- **Invite gate.** `invite_codes` has no policies at all. The only way a profile becomes `approved` is the `redeem_invite()` function.
- **No self-promotion.** Column-level grants stop users from editing their own `status`.
- **Private gender.** Stored in `profile_private`, readable only by its owner, so you can track your women ratio without exposing it.
- **Chat and meets need an accepted, approved pair.** Both people must be `approved`, and a block hides the pair from each other. Banning someone cuts off their chat access at the database, not only in the UI.
- **Plan a meet is gated by messages.** `can_plan_meet()` requires both people to have sent a message, checked in RLS.
- **One active meet per connection**, and only live meets can change state.
- **Anonymous cafe stats.** `cafe_stats()` returns counts only.
- **Photos.** The `avatars` bucket accepts JPEG, PNG and WebP up to 5 MB, and users can only write inside their own folder.

## Known limitations

- Talk shows the last-message preview from the 200 most recent messages across all chats, so older chats can show no preview.
- Chat messages show a time but no date.
- There is no rate limit on invite code attempts.
- A declined connection request cannot be re-sent (unique pair index).
- `schema.sql` is meant to be run once. Policies and the realtime line fail on a second run.
- Supabase's built-in mailer is heavily rate limited. Set up custom SMTP before inviting people (see SETUP.md).

## Roadmap

Not in this version: travel mode (the schema is ready for a `trips` table), live presence, push notifications, unread badges, payments, phone verification.

## Contributing

Issues and pull requests are welcome. Run `npm run lint` and `npm run build` before opening a PR. Never commit `.env.local` or any Supabase `service_role` key.
