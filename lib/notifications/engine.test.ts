import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../db/client";
import * as s from "../db/schema";
import { deliverPending, observeLineup, runNotificationCycle, scheduleReminders } from "./engine";

const pg = new PGlite();
const db = drizzle({ client: pg, schema: s, casing: "snake_case" });
const database = db as unknown as Db;
const now = new Date("2026-11-21T10:00:00Z"); // Saturday 6 PM Manila
const keys = { p256dh: Buffer.alloc(65, 1).toString("base64url"), auth: Buffer.alloc(16, 2).toString("base64url") };
beforeAll(async () => { await migrate(db, { migrationsFolder: "drizzle" }); });
beforeEach(async () => {
  await db.execute(sql`truncate members, months, notification_events, notification_runtime restart identity cascade`);
  await db.insert(s.members).values([{ name: "Faye" }, { name: "Lorence" }, { name: "Mina" }, { name: "Inactive", active: false }]);
  await db.insert(s.months).values({ id: "2026-11", availabilityOpen: true });
  await db.insert(s.services).values({ date: "2026-11-22", monthId: "2026-11", language: "en" });
  await db.insert(s.pushSubscriptions).values([1, 2, 3, 4].map(memberId => ({ deviceId: `device-${memberId}`, memberId,
    endpoint: `https://fcm.googleapis.com/fcm/send/${memberId}`, ...keys })));
});
afterAll(async () => { await pg.close(); });

async function publish() {
  await observeLineup(database, 1, now); // baseline the draft
  await db.update(s.services).set({ status: "published" }).where(eq(s.services.id, 1));
  await observeLineup(database, 1, now);
}

describe("notification delivery", () => {
  it("keeps drafts quiet, publishes to all active subscribed members, and deduplicates repeated observations", async () => {
    await observeLineup(database, 1, now);
    expect(await db.select().from(s.notificationEvents)).toHaveLength(0);
    await publish();
    await Promise.all([observeLineup(database, 1, now), observeLineup(database, 1, now)]);
    expect(await db.select().from(s.notificationEvents)).toHaveLength(1);
    expect(await db.select().from(s.notificationDeliveries)).toHaveLength(3);
    const sender = vi.fn().mockResolvedValue(undefined);
    await deliverPending(database, now, sender);
    await deliverPending(database, now, sender);
    expect(sender).toHaveBeenCalledTimes(3);
    expect(sender.mock.calls[0][1]).toMatchObject({ title: "Sunday lineup is ready", url: "/sunday/2026-11-22" });
  });
  it("baselines existing published lineups during migration without sending old announcements", async () => {
    await db.update(s.services).set({ status: "published" });
    const migration = readFileSync("drizzle/0001_perfect_penance.sql", "utf8");
    await db.execute(sql.raw(migration.slice(migration.indexOf("INSERT INTO lineup_notification_state"))));
    await observeLineup(database, 1, now);
    expect(await db.select().from(s.notificationEvents)).toHaveLength(0);
  });
  it("notifies on real changes, replaces pending old content and ignores timestamp-only saves", async () => {
    await publish();
    await db.update(s.services).set({ notes: "Practice at 5", updatedAt: new Date() });
    await observeLineup(database, 1, now);
    await db.update(s.services).set({ updatedAt: new Date() });
    await observeLineup(database, 1, now);
    const events = await db.select().from(s.notificationEvents);
    expect(events.map(e => e.kind)).toEqual(["published", "updated"]);
    const sender = vi.fn().mockResolvedValue(undefined);
    await deliverPending(database, now, sender);
    expect(sender).toHaveBeenCalledTimes(3);
    expect(sender.mock.calls.every(c => c[1].title === "Sunday lineup updated")).toBe(true);
  });
  it("cancels queued alerts when a lineup is returned to draft", async () => {
    await publish();
    await db.update(s.services).set({ status: "draft" });
    await observeLineup(database, 1, now);
    const sender = vi.fn();
    await deliverPending(database, now, sender);
    expect(sender).not.toHaveBeenCalled();
  });
  it("sends the Saturday reminder only to assigned active members, once per device", async () => {
    await db.update(s.services).set({ status: "published" });
    await db.insert(s.assignments).values([{ serviceId: 1, memberId: 1, role: "joyful" }, { serviceId: 1, memberId: 1, role: "devotion" }, { serviceId: 1, memberId: 4, role: "backup" }]);
    await Promise.all([scheduleReminders(database, now), scheduleReminders(database, now)]);
    expect(await db.select().from(s.notificationEvents)).toHaveLength(1);
    expect(await db.select().from(s.notificationDeliveries)).toHaveLength(1);
    const sender = vi.fn().mockResolvedValue(undefined);
    await deliverPending(database, now, sender);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0][0].endpoint).toContain("/1");
  });
  it("does not schedule reminders for drafts or outside the evening window", async () => {
    await scheduleReminders(database, now);
    await db.update(s.services).set({ status: "published" });
    await scheduleReminders(database, new Date("2026-11-21T09:59:00Z"));
    expect(await db.select().from(s.notificationEvents)).toHaveLength(0);
  });
  it("nudges only unfinished availability and skips someone who answers before delivery", async () => {
    const wed = new Date("2026-11-18T10:00:00Z");
    await db.insert(s.availability).values({ memberId: 1, serviceId: 1, answer: "no" });
    await scheduleReminders(database, wed);
    await scheduleReminders(database, wed);
    expect(await db.select().from(s.notificationDeliveries)).toHaveLength(2);
    await db.insert(s.availability).values({ memberId: 2, serviceId: 1, answer: "maybe" });
    const sender = vi.fn().mockResolvedValue(undefined);
    await deliverPending(database, wed, sender);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0][0].endpoint).toContain("/3");
  });
  it("does not nudge closed months", async () => {
    await db.update(s.months).set({ availabilityOpen: false });
    await scheduleReminders(database, new Date("2026-11-18T10:00:00Z"));
    expect(await db.select().from(s.notificationEvents)).toHaveLength(0);
  });
  it("leases jobs so two concurrent workers do not send the same delivery", async () => {
    await publish();
    const sender = vi.fn().mockResolvedValue(undefined);
    await Promise.all([deliverPending(database, now, sender), deliverPending(database, now, sender)]);
    expect(sender).toHaveBeenCalledTimes(3);
  });
  it("retries temporary failures without re-sending already successful devices", async () => {
    await publish();
    const sender = vi.fn().mockImplementation(async sub => {
      if (sub.endpoint.endsWith("/2")) throw { statusCode: 503 };
    });
    await deliverPending(database, now, sender);
    expect(sender).toHaveBeenCalledTimes(3);
    sender.mockResolvedValue(undefined);
    await deliverPending(database, new Date(now.getTime() + 30_000), sender);
    expect(sender).toHaveBeenCalledTimes(3);
    await deliverPending(database, new Date(now.getTime() + 60_000), sender);
    expect(sender).toHaveBeenCalledTimes(4);
  });
  it("deletes expired device subscriptions and does not retry permanent provider errors", async () => {
    await publish();
    const sender = vi.fn().mockRejectedValue({ statusCode: 410 });
    await deliverPending(database, now, sender);
    expect((await db.select().from(s.pushSubscriptions)).map(p => p.memberId)).toEqual([4]);
    expect(await db.select().from(s.notificationDeliveries)).toHaveLength(0);
  });
  it("honors opt-out and deactivation before queued work sends", async () => {
    await publish();
    await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.memberId, 1));
    await db.update(s.members).set({ active: false }).where(eq(s.members.id, 2));
    const sender = vi.fn().mockResolvedValue(undefined);
    await deliverPending(database, now, sender);
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0][0].endpoint).toContain("/3");
  });
  it("skips stale reminders and removes members no longer assigned before sending", async () => {
    await db.update(s.services).set({ status: "published" });
    await db.insert(s.assignments).values({ serviceId: 1, memberId: 1, role: "joyful" });
    await scheduleReminders(database, now);
    await db.delete(s.assignments);
    const sender = vi.fn();
    await deliverPending(database, now, sender);
    expect(sender).not.toHaveBeenCalled();
    await db.insert(s.assignments).values({ serviceId: 1, memberId: 1, role: "joyful" });
    await publish();
    await deliverPending(database, new Date("2026-11-23T10:00:00Z"), sender);
    expect(sender).not.toHaveBeenCalled();
  });
  it("recovers expired claims and writes a scheduler heartbeat", async () => {
    await publish();
    await db.update(s.notificationDeliveries).set({ lease: "crashed-worker", attempts: 1, availableAt: new Date(now.getTime() - 1) });
    const sender = vi.fn().mockResolvedValue(undefined);
    await runNotificationCycle(database, now, sender);
    expect(sender).toHaveBeenCalledTimes(3);
    expect((await db.select().from(s.notificationRuntime))[0].lastRunAt).toEqual(now);
  });
});
