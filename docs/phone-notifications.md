# Phone notifications: setup and operation

## Vercel setup

1. Import `MarklorenceB/gplc-worship` into Vercel. `vercel.json` runs the database migration
   before the production build. Attach shared Postgres and set `DATABASE_URL`, `TEAM_CODE`,
   `LEADER_CODE`, and a strong `SESSION_SECRET`. Do not use the embedded development database
   in a Vercel function. Local lineup changes are not uploaded by pushing source code.
2. Run `npm run notifications:setup` locally. It writes `VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `CRON_SECRET` into ignored `.env.local`
   without printing secrets or replacing existing keys. The repository URL is the default
   HTTPS contact for VAPID. You can use your own real `mailto:` or HTTPS contact instead.
3. Copy those four values privately into Vercel's **Production** environment variables.
   Keep `APP_TIMEZONE=Asia/Manila`. Redeploy after adding or changing environment variables.
   Use separate keys and a separate database in Preview environments.
4. The committed Vercel cron calls `/api/notifications/run` at **10:00 UTC daily** (6 PM Manila).
   Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically. The handler fails closed
   for a missing/incorrect secret and reports 503 when push configuration is missing.
5. In Vercel, verify the production cron is enabled and its next run returns 200.
   In the app, **Lead → Notifications** should show its last run. This dashboard considers
   the daily scheduler stale after 26 hours; it does not claim delivery to members' phones.
6. Share the deployed HTTPS URL. Each member must sign in and enable their own phone.
   We cannot enable browser/OS permissions remotely for them.

### Timing and retries

The daily job is compatible with Vercel Hobby. Hobby can invoke a 6 PM job between 6 PM
and 6:59 PM. Reminders have an evening window through local midnight; missed old reminders
are not sent days later. Published-lineup actions also dispatch immediately using Next's
`after()`, so those alerts do not normally wait for the daily cron.

For prompt recovery after a failed push or interrupted publish request, use a scheduler
that calls the same authenticated endpoint **every minute**:

- On a Vercel plan supporting minute-level cron, change the schedule in `vercel.json` to
  `* * * * *`, then redeploy. Do not use that expression on Hobby, where deployment rejects it.
- Or use an external scheduler with the HTTPS URL and the authorization header above.
  Do not put the secret in a URL/query string. No external scheduler has been registered by
  this repository or by the local setup script.

The daily fallback only retries when a later invocation occurs. An expired message is
discarded, so daily cron does **not** guarantee prompt retries. A minute-level scheduler is
recommended for production reliability. If `APP_TIMEZONE` changes, update the cron's UTC
schedule too; weekly eligibility uses `APP_TIMEZONE`, while Vercel cron uses UTC.

Official references: [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing),
[cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs),
[iPhone Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Local development

Run `npm run notifications:setup`, restart `npm run dev -- --port 3004` after migrations,
then run `npm run notifications:worker` in another terminal. The worker calls the app over
HTTP, so it does not open a second PGlite process. Use `-- --once` to check one scheduler run.
Set `APP_URL` only if testing another server. A remote URL must use HTTPS.

Desktop localhost is a secure-context exception in supported browsers. A phone accessing
`http://192.168...` is not; use the deployed HTTPS app for real iPhone/Android testing.
The local worker stops when its process or computer stops. It is not a production scheduler.

## Verification before team rollout

1. On an Android phone, sign in to the production URL, open **Me**, enable notifications,
   and send a test. Verify both the alert and the tap destination.
2. On iPhone iOS 16.4+, add the site to the Home Screen, open it, sign in, and repeat the test.
   Also check notification permissions and Focus settings if alerts are muted.
3. With the app closed, publish a future lineup. Confirm an enabled member receives the
   alert and that tapping it opens the right Sunday. Editing an ordinary draft stays quiet.
4. Use a non-production database/clock fixture for scheduled timing tests. Verify an assigned
   member receives the Saturday reminder and an unassigned member does not.
5. Turn notifications off or sign out on one device. Verify other devices still work and
   that the removed subscription no longer appears in the leader overview.

Automated tests cover recipient selection, published/draft transitions, unchanged saves,
Manila time boundaries, year rollover, migration baselines, duplicate scheduler invocations,
concurrent claims, retries, expired subscriptions, opt-out, deactivation and stale messages.
Provider delivery and mobile OS permission behavior still need the real-device checks above.

## Implementation notes

- Device subscriptions, observed lineup versions, events and per-device delivery jobs live
  in Postgres. No process-local subscription list or browser timer is used for reminders.
- A scheduler reconciles future lineups, so it can recover changes if `after()` is interrupted.
  The migration baselines existing lineups to avoid announcing old published content.
- Jobs have unique event/device keys and two-minute leases. Temporary errors retry with
  backoff (up to five attempts). HTTP 404/410 deletes invalid subscriptions; permanent
  provider errors stop retrying. Opt-out/deactivation and current assignments are rechecked
  before sending. Events older than 30 days are removed.
- Delivery is at-least-once: a crash after provider acceptance but before recording success
  may retry. Stable notification tags replace an earlier on-device alert; they are not read receipts.
- Outgoing push URLs are restricted to known HTTPS push providers. Members can only test
  their own current device, at most once per minute. Private keys and endpoints never appear
  in page data or logs. The service worker does not cache authenticated pages or lineups.
- Keep the VAPID key pair stable. Rotating it requires members to enable notifications again;
  the setup button detects an old browser key and resubscribes.
