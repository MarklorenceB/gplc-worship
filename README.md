# GPLC Worship Team

A mobile-first web app for the GPLC praise and worship team: see your Sundays, mark
availability, and (for leaders) build and publish lineups without the shared doc.

Design notes: `docs/superpowers/specs/2026-10-29-gplc-lineup-app-design.md`

## Run it on your computer

```bash
npm install
npm run dev
```

Open http://localhost:3000 (on your phone, use the "Network" address `npm run dev` prints,
while on the same Wi-Fi).

The first time it runs, it creates a small built-in database in `.data/pglite` and loads the
roster and the September–December 2026 lineups from the team doc. Delete `.data/` to start over.

Local codes (only used when the matching setting is empty):

| What        | Code     |
| ----------- | -------- |
| Team code   | `gplc`   |
| Leader code | `leader` |

## Settings

Copy `.env.example` to `.env.local` and fill it in. In production `TEAM_CODE`, `LEADER_CODE`
and `SESSION_SECRET` are required; without them the app shows an error instead of signing anyone in.

- `TEAM_CODE`: shared with everyone, pinned in the group chat.
- `LEADER_CODE`: only for leaders; entered on the Me page.
- `SESSION_SECRET`: a long random string (`openssl rand -base64 32`).
- `DATABASE_URL`: Postgres connection string. Leave empty locally.
- `APP_TIMEZONE`: what "today" means. Defaults to `Asia/Manila`.

Changing `TEAM_CODE` signs everyone out. Changing `LEADER_CODE` turns off leader tools for
everyone until they enter the new one.

## Put it online (Vercel)

1. Push this folder to a GitHub repo and import it in Vercel.
2. Add a Postgres database from the Vercel Marketplace (Neon works well). It sets `DATABASE_URL`.
3. Add `TEAM_CODE`, `LEADER_CODE` and `SESSION_SECRET` in the project's environment variables.
4. Set the build command to `npm run db:setup && npm run build`. `db:setup` creates the tables
   and loads the doc's data the first time; after that it only applies new migrations.

## Scripts

- `npm run dev`: start locally.
- `npm test`: unit tests for dates, lineup checks, sessions and the group-chat text.
- `npm run lint`: ESLint.
- `npm run db:setup`: create tables and load seed data into `DATABASE_URL` (or local PGlite).
- `npm run db:generate`: create a new migration after changing `lib/db/schema.ts`.

## How it's built

- Next.js 16 App Router with Cache Components, Tailwind CSS 4.
- Drizzle ORM on Postgres; PGlite for local development.
- `lib/lineup.ts` holds the rules: clash checks (one person in two band or sound slots),
  people who said they can't or aren't sure, and anyone serving 3+ Sundays in a month.
- Every Server Action re-checks the session, and leader actions re-check the leader code.

## Things to check in the imported data

- "Andoy" and "Andrey" are separate people in the app because the doc spells both. If they're
  the same person, rename one in Team roster and deactivate the other.
- Leader codes are shared, not per person. Anyone with the leader code can edit lineups.

## Automatic updates and year planning

Signed-in screens check the shared database every five seconds and refresh their data
when a lineup, song, assignment, month setting, roster entry, or availability answer changes.
Checks pause in hidden tabs, resume when you return, and retry after connection failures.
Unsaved form entries defer updates until you save or navigate away. Everyone must use the
same deployed app/database (or the same local server on your Wi-Fi) to share updates.

In **Lead → Plan a full year**, choose a year and the first Sunday's language, then select
**Create year's lineups**. This creates all 12 months and their Sunday drafts. Languages
alternate across month boundaries, continuing from any existing Sunday. Existing months,
lineups, songs, assignments, and availability settings are preserved. Repeating the request
only fills missing months/Sundays. New months keep availability closed unless you tick the
option to open it. Use **View year** in Lead or **Jump to month** in Schedule to navigate.

## Phone notifications and reminders

All active members can enable Web Push from **Me → Phone notifications**. On iPhone
(iOS 16.4+), first add the HTTPS app to the Home Screen and open it from that icon.
On Android, open the HTTPS app in a current supported browser. Tap **Enable notifications**,
allow permission, and use **Send me a test**. Setup is per device. Signing out or choosing
**Turn off on this phone** removes that device's server subscription; other devices keep working.

- Publishing a future/current lineup alerts all active subscribed members.
- Saved changes to a published lineup alert those members too. No-op saves and ordinary draft
  edits stay quiet. Pending older alerts are replaced, and the phone reuses one notification tag
  per Sunday rather than stacking every edit. Returning a lineup to draft cancels queued alerts.
- Saturday at 6 PM **Asia/Manila**: reminder for members assigned to Sunday's published lineup.
- Wednesday at 6 PM: one availability follow-up per member with unanswered future Sundays in
  open months. Answers of any kind count as answered. Closed months are excluded.
- **Lead → Notifications** shows registered phones, queue counts, and the last scheduler run.
  Registration/provider acceptance is not a delivery or read receipt.

Read [the deployment and verification checklist](docs/phone-notifications.md) before enabling
notifications for the whole team. The committed daily Vercel job is compatible with Hobby;
it can run up to an hour late. Frequent retries need a more frequent scheduler.
