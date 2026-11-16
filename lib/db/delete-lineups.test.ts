import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "./client";
import * as schema from "./schema";
import { deleteMonthLineups, deleteSundayLineup, LineupChangedError } from "./delete-lineups";
import { getLineupRevision } from "./revision";

const mocks = vi.hoisted(() => ({ leader: vi.fn(), db: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireLeader: mocks.leader }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.db }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { deleteLineups } from "../../app/(app)/lead/delete-actions";

const pg = new PGlite();
const db = drizzle({ client: pg, schema, casing: "snake_case" });
const database = db as unknown as Db;
let planned: (typeof schema.services.$inferSelect)[];

beforeAll(async () => { await migrate(db, { migrationsFolder: "drizzle" }); });
beforeEach(async () => {
  vi.resetAllMocks();
  mocks.leader.mockResolvedValue({ id: 1, leader: true });
  mocks.db.mockResolvedValue(database);
  mocks.redirect.mockImplementation((url: string) => { throw new Error(`REDIRECT:${url}`); });
  await db.execute(sql`drop table if exists deletion_guard`);
  await db.execute(sql`truncate members, months restart identity cascade`);
  const [member] = await db.insert(schema.members).values({ name: "Deletion test member" }).returning();
  await db.insert(schema.months).values([{ id: "2026-11", theme: "November" }, { id: "2026-12", theme: "Keep December" }]);
  planned = await db.insert(schema.services).values([
    { date: "2026-11-22", monthId: "2026-11", language: "tl", status: "published" },
    { date: "2026-11-29", monthId: "2026-11", language: "en" },
    { date: "2026-12-06", monthId: "2026-12", language: "tl", notes: "Keep me" },
  ]).returning();
  for (const service of planned) {
    await db.insert(schema.serviceSongs).values({ serviceId: service.id, position: 0, title: `Song ${service.date}` });
    await db.insert(schema.assignments).values({ serviceId: service.id, memberId: member.id, role: "joyful" });
    await db.insert(schema.availability).values({ serviceId: service.id, memberId: member.id, answer: "yes" });
    await db.insert(schema.lineupNotificationState).values({ serviceId: service.id, fingerprint: "test", status: service.status });
  }
  await db.insert(schema.availabilityNotes).values(["2026-11", "2026-12"].map(monthId => ({ memberId: member.id, monthId, songIdea: "Keep with month" })));
  const [device] = await db.insert(schema.pushSubscriptions).values({ memberId: member.id, deviceId: "test-device", endpoint: "https://example.test/push", p256dh: "test", auth: "test" }).returning();
  await db.insert(schema.announcements).values({ id: "keep-announcement", authorId: member.id, authorName: member.name, title: "Keep", body: "Keep this message" });
  const expiresAt = new Date("2026-12-30T00:00:00Z");
  const events = await db.insert(schema.notificationEvents).values([
    ...planned.map(service => ({ id: `lineup:${service.id}`, kind: "published" as const, serviceId: service.id, expiresAt,
      payload: { title: "Lineup", body: "Test", url: `/sunday/${service.date}`, tag: "lineup" } })),
    ...["2026-11", "2026-12"].map(monthId => ({ id: `availability:${monthId}`, kind: "availability" as const, expiresAt,
      payload: { title: "Availability", body: "Test", url: `/availability?month=${monthId}`, tag: "availability" } })),
    { id: "announcement:keep", kind: "announcement" as const, announcementId: "keep-announcement", expiresAt,
      payload: { title: "Keep", body: "Test", url: "/announcements/keep-announcement", tag: "announcement" } },
  ]).returning();
  await db.insert(schema.notificationDeliveries).values(events.map(event => ({ eventId: event.id, subscriptionId: device.id })));
});
afterAll(async () => { await pg.close(); });

function form(scope: "sunday" | "month", confirmed = true) {
  const data = new FormData();
  const target = scope === "sunday" ? planned[0].date : "2026-11";
  data.set("scope", scope); data.set("target", target);
  data.set("serviceId", String(planned[0].id));
  data.set("serviceIds", JSON.stringify(planned.slice(0, 2).map(s => s.id)));
  if (confirmed) data.set("confirmed", target);
  return data;
}

async function expectDecemberUnchanged() {
  expect(await db.select().from(schema.services).where(eq(schema.services.id, planned[2].id))).toEqual([planned[2]]);
  expect(await db.select().from(schema.members)).toHaveLength(1);
  expect(await db.select().from(schema.pushSubscriptions)).toHaveLength(1);
  expect(await db.select().from(schema.announcements)).toHaveLength(1);
}

describe("leader lineup deletion", () => {
  it("rejects unauthenticated and member requests before reaching the database", async () => {
    for (const destination of ["/login", "/me?leader=required"]) {
      mocks.leader.mockRejectedValueOnce(new Error(destination));
      await expect(deleteLineups(undefined, form("sunday"))).rejects.toThrow(destination);
    }
    expect(mocks.db).not.toHaveBeenCalled();
    expect(await db.select().from(schema.services)).toHaveLength(3);
  });

  it("requires explicit confirmation and rejects invalid targets", async () => {
    for (const scope of ["sunday", "month"] as const) {
      expect(await deleteLineups(undefined, form(scope, false))).toMatchObject({ error: expect.stringContaining("Confirm") });
    }
    const invalid = form("sunday"); invalid.set("target", "2026-02-30"); invalid.set("confirmed", "2026-02-30");
    expect(await deleteLineups(undefined, invalid)).toMatchObject({ error: expect.any(String) });
    expect(mocks.db).not.toHaveBeenCalled();
  });

  it("removes one Sunday and its linked records, updates the shared revision, and redirects", async () => {
    const before = await getLineupRevision(database);
    await expect(deleteLineups(undefined, form("sunday"))).rejects.toThrow("REDIRECT:/lead?year=2026&deleted=2026-11-22");
    for (const table of [schema.services, schema.serviceSongs, schema.assignments, schema.availability, schema.lineupNotificationState]) {
      expect(await db.select().from(table)).toHaveLength(2);
    }
    expect(await db.select().from(schema.months)).toHaveLength(2);
    expect(await db.select().from(schema.availabilityNotes)).toHaveLength(2);
    expect((await db.select().from(schema.notificationEvents)).map(e => e.id)).not.toContain(`lineup:${planned[0].id}`);
    expect(await db.select().from(schema.notificationDeliveries)).toHaveLength(4);
    expect(await getLineupRevision(database)).not.toBe(before);
    expect(mocks.revalidate).toHaveBeenCalledWith("/", "layout");
    await expectDecemberUnchanged();
  });

  it("removes a whole month and its reminders without changing other months or members", async () => {
    await expect(deleteLineups(undefined, form("month"))).rejects.toThrow("REDIRECT:/lead?year=2026&deleted=2026-11");
    for (const table of [schema.months, schema.services, schema.serviceSongs, schema.assignments, schema.availability, schema.availabilityNotes, schema.lineupNotificationState]) {
      expect(await db.select().from(table)).toHaveLength(1);
    }
    expect(await db.select().from(schema.notificationEvents)).toHaveLength(3);
    expect(await db.select().from(schema.notificationDeliveries)).toHaveLength(3);
    await expectDecemberUnchanged();
  });

  it("refuses a stale month confirmation and mismatched Sunday identity", async () => {
    await expect(deleteMonthLineups(database, "2026-11", [planned[0].id])).rejects.toBeInstanceOf(LineupChangedError);
    expect(await deleteSundayLineup(database, planned[0].id, planned[1].date)).toBeNull();
    expect(await db.select().from(schema.services)).toHaveLength(3);
    expect(await db.select().from(schema.notificationEvents)).toHaveLength(6);
  });

  it("handles repeat deletion safely and allows removing an empty month", async () => {
    expect(await deleteSundayLineup(database, planned[0].id, planned[0].date)).not.toBeNull();
    expect(await deleteSundayLineup(database, planned[0].id, planned[0].date)).toBeNull();
    await db.insert(schema.months).values({ id: "2027-01" });
    expect(await deleteMonthLineups(database, "2027-01", [])).toEqual({ monthId: "2027-01", sundays: 0 });
    expect(await deleteMonthLineups(database, "2027-01", [])).toBeNull();
  });

  it("rolls back reminder cleanup if the month deletion fails", async () => {
    await db.execute(sql`create table deletion_guard (service_id integer references services(id) on delete restrict)`);
    await db.execute(sql`insert into deletion_guard values (${planned[0].id})`);
    await expect(deleteMonthLineups(database, "2026-11", planned.slice(0, 2).map(s => s.id))).rejects.toThrow();
    expect(await db.select().from(schema.services)).toHaveLength(3);
    expect(await db.select().from(schema.months)).toHaveLength(2);
    expect(await db.select().from(schema.notificationEvents)).toHaveLength(6);
    expect(await db.select().from(schema.notificationDeliveries)).toHaveLength(6);
  });
});
