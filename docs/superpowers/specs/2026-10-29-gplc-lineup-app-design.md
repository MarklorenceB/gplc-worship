# GPLC Worship Team Lineup App — v1 design

Date: 2026-10-29
Prototype: https://claude.ai/artifact/5jjr8j5FpQydiCBYsHcCDu (private canvas)
Source data: the team's lineup Google Doc (Sep–Dec 2026 imported as seed data)

## Goal

Replace the shared lineup doc with a mobile-first web app. Lineups get decided earlier
because availability is collected in the app, and the load is spread more fairly because
leaders see who served recently.

Success for v1: every member can open the app on their phone, see their Sundays, and mark
availability for the next month; leaders can see who is free and build, check and publish
a Sunday lineup without the doc.

## Users

- **Members** (singers and musicians): see the schedule and lineups, mark availability.
- **Leaders/coordinators**: everything members do, plus build and publish lineups, open
  availability for a month, manage the roster.

## Sign-in

No personal accounts in v1. The team shares a **team code** (env `TEAM_CODE`) in the group
chat. After entering it, a member picks their name from the roster. Leaders additionally
enter a **leader code** (env `LEADER_CODE`) on the Me page to unlock leader tools.
The session is an HMAC-signed, httpOnly cookie (env `SESSION_SECRET`), valid 180 days.

Trade-off: anyone with the team code can pick any name. Acceptable for schedule data;
revisit if the app later stores anything private.

## Screens (v1)

Members:
1. **Home** — next Sunday I serve and my roles, open availability call-outs, my upcoming Sundays.
2. **Schedule** — month view of Sunday cards (language, palette, leaders, status), "only mine" filter.
3. **Sunday** — songs (Joyful/Solemn/backup), vocalists, band, devotion/soaking, palette;
   "Copy for group chat" in the doc's emoji format.
4. **Availability** — per Sunday Can / Not sure / Can't; roles I'm open to; "I'd like to try
   leading"; a song suggestion.
5. **Me** — who I'm signed in as, unlock leader tools, sign out.

Leaders:
6. **Lead** — months with progress, open/close availability, add a month (Sundays generated,
   language alternates Tagalog/English).
7. **Who's free** — replies per Sunday, free people sorted by fewest Sundays served,
   copyable reminder listing who hasn't replied.
8. **Lineup builder** — edit songs, vocals, band slots (LG KB BG AG AD ST), devotion, soaking,
   palette, notes; checks for double-booked band/tech slots, people who said Can't or Not sure,
   and anyone serving 3+ Sundays in the month; publish / back to draft.
9. **Team** — add members, set what they sing/play, deactivate.

Later (not v1): song library by theme, lyrics and flow, stage mode, vocal parts per song,
push/email notifications, events program.

## Architecture

- Next.js 16 App Router (Cache Components on), TypeScript, Tailwind v4.
- Server Components read data inside `<Suspense>`; Server Actions mutate and call
  `revalidatePath('/', 'layout')`. Every action re-checks the session (and leader flag).
- Drizzle ORM on Postgres. Local dev uses embedded PGlite (`.data/pglite`, zero setup,
  auto-migrated and auto-seeded). Production uses any Postgres via `DATABASE_URL`
  (e.g. Neon from the Vercel Marketplace), set up with `npm run db:setup`.
- Pure logic (dates, checks, fairness counts, group-chat text) lives in `lib/` with unit tests (Vitest).

## Data model

- `members` — name, sings, instruments (band codes), active.
- `months` — id `YYYY-MM`, theme, note, availabilityOpen.
- `services` — date, month, language (`tl`/`en`), palette, occasion, notes, status (`draft`/`published`).
- `service_songs` — service, position, title, artist, set (`joyful`/`solemn`/none), isBackup.
- `assignments` — service, member, role (`joyful`, `solemn`, `backup`, `LG`…`ST`, `devotion`, `soaking`).
- `availability` — member × service → `yes`/`maybe`/`no`.
- `availability_notes` — member × month → open-to roles, tryLead, songIdea.

## Checks (builder)

- **Conflict**: one person in two or more band/tech slots on the same Sunday.
  (Singing and playing on the same Sunday is normal for this team and is allowed.)
- **Said Can't** (error) / **Not sure** (warning) for anyone assigned.
- **Heavy month**: serving 3 or more Sundays in the same month (warning).
- Checklist: songs, Joyful leader, Solemn leader, devotion.

## Seed data notes

- "Andoy" and "Andrey" appear as separate names in the doc; kept separate until a leader merges them.
- "[instru]" placeholders and facilitator marks are dropped.
- Sep–Oct are imported as published, Nov–Dec as drafts with availability open.
