import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import * as webpush from "web-push";
import type { Db } from "../db/client";
import { assignments, availability, lineupNotificationState, members, months, notificationDeliveries as deliveries,
  notificationEvents as events, notificationRuntime, pushSubscriptions as subscriptions, services,
  type NotificationPayload } from "../db/schema";
import { shortDate, todayISO } from "../dates";
import { reminderWindow } from "./clock";
import { pushConfig, validSubscription, type BrowserSubscription } from "./config";
import { lineupFingerprint } from "./snapshot";

type QueryDb = Pick<Db, "select" | "insert" | "update" | "delete" | "execute">;
type NewEvent = typeof events.$inferInsert;
export type Sender = (subscription: BrowserSubscription, payload: NotificationPayload, ttl: number) => Promise<void>;

export const sendPush: Sender = async (subscription, payload, ttl) => {
  const config = pushConfig();
  if (!config) throw new Error("Push is not configured");
  if (!validSubscription(subscription)) throw Object.assign(new Error("Invalid push endpoint"), { statusCode: 410 });
  await webpush.sendNotification(subscription, JSON.stringify(payload), {
    vapidDetails: config, TTL: Math.max(0, Math.min(ttl, 86400)), timeout: 5000, urgency: "normal",
  });
};

async function enqueue(db: QueryDb, event: NewEvent, memberIds: number[] | null, availableAt: Date) {
  const inserted = await db.insert(events).values(event).onConflictDoNothing().returning({ id: events.id });
  if (!inserted.length || (memberIds && !memberIds.length)) return;
  const devices = await db.select({ id: subscriptions.id }).from(subscriptions)
    .innerJoin(members, eq(subscriptions.memberId, members.id))
    .where(and(eq(members.active, true), memberIds ? inArray(members.id, memberIds) : undefined));
  if (devices.length) await db.insert(deliveries).values(devices.map(device => ({
    eventId: event.id, subscriptionId: device.id, availableAt,
  }))).onConflictDoNothing();
}

/** Observe durable content, so the scheduler also recovers notifications if an action's after() is interrupted. */
export async function observeLineup(db: Db, serviceId: number, now = new Date()) {
  await db.transaction(async tx => {
    // Serialize notification state changes for this Sunday across app instances.
    const [service] = await tx.select().from(services).where(eq(services.id, serviceId)).for("update");
    if (!service || service.date < todayISO(undefined, now)) return;
    const [{ fingerprint }] = await tx.select({ fingerprint: lineupFingerprint }).from(services).where(eq(services.id, serviceId));
    const [previous] = await tx.select().from(lineupNotificationState).where(eq(lineupNotificationState.serviceId, serviceId));
    if (previous?.fingerprint === fingerprint) return;
    const version = (previous?.version ?? 0) + 1;
    await tx.insert(lineupNotificationState).values({ serviceId, fingerprint, status: service.status, version })
      .onConflictDoUpdate({ target: lineupNotificationState.serviceId, set: { fingerprint, status: service.status, version } });

    const oldEvents = tx.select({ id: events.id }).from(events).where(and(eq(events.serviceId, serviceId),
      service.status === "draft" ? undefined : inArray(events.kind, ["published", "updated"])));
    await tx.update(deliveries).set({ status: "cancelled" }).where(and(eq(deliveries.status, "pending"), inArray(deliveries.eventId, oldEvents)));
    if (service.status !== "published") return;
    const kind = previous?.status === "published" ? "updated" : "published";
    await enqueue(tx, {
      id: `lineup:${serviceId}:${version}`, kind, serviceId, createdAt: now,
      expiresAt: new Date(now.getTime() + 24 * 3600_000),
      payload: {
        title: kind === "published" ? "Sunday lineup is ready" : "Sunday lineup updated",
        body: `${shortDate(service.date)}: ${kind === "published" ? "Our lineup is published." : "Songs, assignments or details have changed."} Tap to check the latest plan.`,
        url: `/sunday/${service.date}`, tag: `lineup-${service.date}`,
      },
    }, null, now);
  });
}

/** Weekly reminders are unique per Sunday/member/week; repeated scheduler calls are safe. */
export async function scheduleReminders(db: Db, now = new Date()) {
  const window = reminderWindow(now);
  if (window.sunday) {
    const upcoming = await db.select().from(services).where(and(eq(services.date, window.tomorrow), eq(services.status, "published")));
    for (const service of upcoming) {
      const people = await db.select({ id: assignments.memberId }).from(assignments).where(eq(assignments.serviceId, service.id));
      await db.transaction(tx => enqueue(tx, {
        id: `sunday:${service.id}:${window.date}`, kind: "sunday", serviceId: service.id, createdAt: now, expiresAt: window.expiresAt,
        payload: { title: "You're serving tomorrow", body: `${shortDate(service.date)}: Please check your songs, role and reminders. See you, team!`,
          url: `/sunday/${service.date}`, tag: `sunday-${service.date}` },
      }, [...new Set(people.map(p => p.id))], now));
    }
  }
  if (window.availability) {
    const open = await db.select({ id: services.id, monthId: services.monthId }).from(services)
      .innerJoin(months, eq(months.id, services.monthId))
      .where(and(eq(months.availabilityOpen, true), gte(services.date, window.date))).orderBy(asc(services.date));
    if (!open.length) return;
    const people = await db.select({ id: members.id }).from(members).where(eq(members.active, true));
    const answers = await db.select().from(availability).where(inArray(availability.serviceId, open.map(s => s.id)));
    for (const person of people) {
      const answered = new Set(answers.filter(a => a.memberId === person.id).map(a => a.serviceId));
      const first = open.find(s => !answered.has(s.id));
      if (!first) continue;
      await db.transaction(tx => enqueue(tx, {
        id: `availability:${person.id}:${window.date}`, kind: "availability", createdAt: now, expiresAt: window.expiresAt,
        payload: { title: "When can you serve?", body: "Please finish your availability for the upcoming Sundays so our leaders can plan.",
          url: `/availability?month=${first.monthId}`, tag: "availability-reminder" },
      }, [person.id], now));
    }
  }
}

async function stillRelevant(db: Db, event: typeof events.$inferSelect, memberId: number, now: Date) {
  if (event.expiresAt <= now) return false;
  if (event.serviceId) {
    const [service] = await db.select().from(services).where(eq(services.id, event.serviceId));
    if (!service || service.status !== "published" || service.date < todayISO(undefined, now)) return false;
    if (event.kind === "sunday") {
      const [person] = await db.select({ id: assignments.id }).from(assignments)
        .where(and(eq(assignments.serviceId, service.id), eq(assignments.memberId, memberId))).limit(1);
      if (!person) return false;
    }
  }
  if (event.kind === "availability") {
    const month = new URL(event.payload.url, "https://app.invalid").searchParams.get("month");
    const missing = await db.select({ id: services.id }).from(services).innerJoin(months, eq(months.id, services.monthId))
      .leftJoin(availability, and(eq(availability.serviceId, services.id), eq(availability.memberId, memberId)))
      .where(and(eq(months.id, month ?? ""), eq(months.availabilityOpen, true), gte(services.date, todayISO(undefined, now)), sql`${availability.memberId} is null`)).limit(1);
    if (!missing.length) return false;
  }
  return true;
}

/** Claims are atomic and expire after a crash; each device has its own retry state. */
export async function deliverPending(db: Db, now = new Date(), sender: Sender = sendPush) {
  const due = and(eq(deliveries.status, "pending"), lte(deliveries.availableAt, now), lt(deliveries.attempts, 5));
  const candidates = await db.select({ id: deliveries.id }).from(deliveries).where(due).orderBy(asc(deliveries.availableAt)).limit(40);
  if (!candidates.length) return { sent: 0, failed: 0, processed: 0 };
  const lease = randomUUID();
  const claimed = await db.update(deliveries).set({ lease, availableAt: new Date(now.getTime() + 120_000), attempts: sql`${deliveries.attempts} + 1` })
    .where(and(due, inArray(deliveries.id, candidates.map(c => c.id)))).returning();
  const counts = { sent: 0, failed: 0, processed: claimed.length };
  for (let offset = 0; offset < claimed.length; offset += 5) {
    await Promise.all(claimed.slice(offset, offset + 5).map(async job => {
      // Re-read after claiming: opt-outs, deactivation and coalesced edits can cancel queued work.
      const [current] = await db.select({ event: events, device: subscriptions, active: members.active, status: deliveries.status })
        .from(deliveries).innerJoin(events, eq(events.id, deliveries.eventId))
        .innerJoin(subscriptions, eq(subscriptions.id, deliveries.subscriptionId))
        .innerJoin(members, eq(members.id, subscriptions.memberId)).where(eq(deliveries.id, job.id));
      const owned = and(eq(deliveries.id, job.id), eq(deliveries.lease, lease), eq(deliveries.status, "pending"));
      if (!current || current.status !== "pending") return;
      if (!current.active || !(await stillRelevant(db, current.event, current.device.memberId, now))) {
        await db.update(deliveries).set({ status: "cancelled", lease: null }).where(owned);
        return;
      }
      try {
        await sender({ endpoint: current.device.endpoint, keys: { p256dh: current.device.p256dh, auth: current.device.auth } },
          current.event.payload, Math.floor((current.event.expiresAt.getTime() - now.getTime()) / 1000));
        await db.update(deliveries).set({ status: "sent", sentAt: now, lease: null, error: null }).where(owned);
        counts.sent++;
      } catch (error) {
        const status = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 0;
        if (status === 404 || status === 410) {
          await db.delete(subscriptions).where(eq(subscriptions.id, current.device.id));
        } else {
          const permanent = status >= 400 && status < 500 && status !== 408 && status !== 429;
          await db.update(deliveries).set({ status: permanent || job.attempts >= 5 ? "failed" : "pending", lease: null,
            error: status ? `Push provider returned ${status}` : "Push service unavailable",
            availableAt: new Date(now.getTime() + Math.min(30, 2 ** (job.attempts - 1)) * 60_000),
          }).where(owned);
        }
        counts.failed++;
      }
    }));
  }
  return counts;
}

export async function runNotificationCycle(db: Db, now = new Date(), sender: Sender = sendPush) {
  const upcoming = await db.select({ id: services.id }).from(services).where(gte(services.date, todayISO(undefined, now)));
  for (const service of upcoming) await observeLineup(db, service.id, now);
  await scheduleReminders(db, now);
  // A crash on a fifth attempt should not leave an unclaimable pending row forever.
  await db.update(deliveries).set({ status: "failed", lease: null, error: "Delivery attempts exhausted" })
    .where(and(eq(deliveries.status, "pending"), gte(deliveries.attempts, 5), lte(deliveries.availableAt, now)));
  const result = await drainPending(db, now, sender);
  await db.delete(events).where(lt(events.createdAt, new Date(now.getTime() - 30 * 86400_000)));
  await db.insert(notificationRuntime).values({ id: "scheduler", lastRunAt: now })
    .onConflictDoUpdate({ target: notificationRuntime.id, set: { lastRunAt: now } });
  return result;
}

export async function drainPending(db: Db, now = new Date(), sender: Sender = sendPush) {
  const started = Date.now();
  const result = { sent: 0, failed: 0, processed: 0 };
  do {
    const batch = await deliverPending(db, now, sender);
    result.sent += batch.sent; result.failed += batch.failed; result.processed += batch.processed;
    if (batch.processed < 40) break;
  } while (Date.now() - started < 15_000); // Leave room for one last bounded batch and DB work in a 60s function.
  return result;
}
