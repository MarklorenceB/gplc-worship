import { Suspense } from "react";
import { and, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { buttonClass, Card, Chip, Notice, PageHeader, PageSkeleton, SectionTitle } from "@/components/ui";
import { requireLeader } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { members, notificationDeliveries, notificationRuntime, pushSubscriptions } from "@/lib/db/schema";
import { pushConfig } from "@/lib/notifications/config";
import { TEAM_TIME_ZONE } from "@/lib/dates";

export const metadata = { title: "Notifications" };
export default function NotificationsPage() {
  return <Suspense fallback={<PageSkeleton />}><NotificationOverview /></Suspense>;
}
async function NotificationOverview() {
  await requireLeader();
  const db = await getDb();
  const people = await db.select({ id: members.id, name: members.name, devices: sql<number>`count(${pushSubscriptions.id})::int` })
    .from(members).leftJoin(pushSubscriptions, eq(pushSubscriptions.memberId, members.id))
    .where(eq(members.active, true)).groupBy(members.id, members.name).orderBy(members.name);
  const [runtime] = await db.select({ lastRunAt: notificationRuntime.lastRunAt,
    recent: sql<boolean>`${notificationRuntime.lastRunAt} > now() - interval '26 hours'` })
    .from(notificationRuntime).where(eq(notificationRuntime.id, "scheduler"));
  const enabled = people.filter(p => p.devices > 0).length;
  const ready = !!pushConfig();
  const recent = !!runtime?.recent;
  const [pending] = await db.select({ count: sql<number>`count(*)::int` }).from(notificationDeliveries).where(eq(notificationDeliveries.status, "pending"));
  const [failed] = await db.select({ count: sql<number>`count(*)::int` }).from(notificationDeliveries)
    .where(and(eq(notificationDeliveries.status, "failed"), sql`${notificationDeliveries.availableAt} > now() - interval '1 day'`));
  return <>
    <PageHeader eyebrow="Leader tools" title="Keep the team in the loop" back={{ href: "/lead", label: "Lineups" }}>
      <p className="mt-2 text-[15px] text-muted">Phone setup and automatic reminders, in one place.</p>
    </PageHeader>
    <div className="screen-grid">
      <Card><SectionTitle>Team readiness</SectionTitle><p className="text-[34px] font-extrabold text-primary">{enabled} <span className="text-[17px] font-normal text-muted">of {people.length} members</span></p>
        <p className="mt-2 text-[14px] text-muted">Have registered at least one phone. Each member needs to allow notifications on their own device.</p>
        <Link href="/me#phone-notifications" className={buttonClass("soft", "mt-4")}>Set up my phone</Link></Card>
      <Card><SectionTitle>Reminder service</SectionTitle><Chip tone={ready && recent ? "ok" : "warn"}>{!ready ? "Setup needed" : recent ? "Scheduler connected" : "Waiting for scheduler"}</Chip>
        <p className="mt-3 text-[14px] text-muted">{runtime ? `Last run: ${runtime.lastRunAt.toLocaleString("en-PH", { timeZone: TEAM_TIME_ZONE, dateStyle: "medium", timeStyle: "short" })} (${TEAM_TIME_ZONE}).` : "No scheduled runs yet. The online scheduler must be connected for automatic reminders."}</p>
        <p className="mt-2 text-[14px] text-muted">{pending.count} queued · {failed.count} failed in the last day</p>
        {!ready && <p className="mt-3 text-[14px]">Ask the app administrator to finish the push-service configuration.</p>}
      </Card>
      <Card className="grid-full"><SectionTitle>What the team will receive</SectionTitle>
        <ul className="space-y-3 text-[15px]">
          <li><strong>Leader announcements:</strong> all active members with notifications enabled. Everyone can also read them in Updates.</li>
          <li><strong>Published lineup:</strong> all active members with notifications enabled. Draft edits stay quiet.</li>
          <li><strong>Published lineup changes:</strong> all subscribed members. An updated alert replaces the earlier notification for that Sunday.</li>
          <li><strong>Saturday, 6 PM:</strong> members assigned to the next day&apos;s published lineup.</li>
          <li><strong>Wednesday, 6 PM:</strong> members with unanswered Sundays in open availability months.</li>
        </ul><p className="mt-4 text-[12px] text-muted">All times: {TEAM_TIME_ZONE}. The daily scheduler may run up to an hour after 6 PM. Connectivity and phone settings can also delay delivery. Registration does not confirm that a notification was read.</p>
      </Card>
      <Card className="grid-full"><SectionTitle>Member phones</SectionTitle>
        {!enabled && <div className="mb-4"><Notice>Ask the team to open Me → Phone notifications → Enable notifications. On iPhone, add the app to the Home Screen first.</Notice></div>}
        <ul className="grid gap-2 sm:grid-cols-2">{people.map(person => <li key={person.id} className="flex items-center justify-between gap-2 rounded-2xl bg-ground p-3">
          <span className="font-semibold">{person.name}</span><Chip tone={person.devices ? "ok" : "neutral"}>{person.devices ? `${person.devices} phone${person.devices === 1 ? "" : "s"}` : "Not enabled"}</Chip>
        </li>)}</ul>
      </Card>
    </div>
  </>;
}
