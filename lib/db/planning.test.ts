import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./client";
import * as schema from "./schema";
import { planYear, validPlanningYear, yearSundays } from "./plan-year";
import { getLineupRevision } from "./revision";

const pg = new PGlite();
const db = drizzle({ client: pg, schema, casing: "snake_case" });
const database = db as unknown as Db;

beforeAll(async () => { await migrate(db, { migrationsFolder: "drizzle" }); });
beforeEach(async () => {
  await db.execute(sql`truncate members, months, services, service_songs, assignments, availability, availability_notes restart identity cascade`);
});
afterAll(async () => { await pg.close(); });

describe("year planning", () => {
  it("plans all 52 Sundays in 2027 and alternates across month boundaries", () => {
    const sundays = yearSundays(2027, "tl");
    expect(sundays).toHaveLength(52);
    expect(sundays[0]).toMatchObject({ date: "2027-01-03", language: "tl" });
    expect(sundays.at(-1)?.date).toBe("2027-12-26");
    expect(new Set(sundays.map((s) => s.monthId)).size).toBe(12);
    for (let index = 1; index < sundays.length; index++) {
      expect(sundays[index].language).not.toBe(sundays[index - 1].language);
      expect(new Date(`${sundays[index].date}T00:00:00Z`).getUTCDay()).toBe(0);
    }
  });

  it("handles a leap year with 53 Sundays and validates year boundaries", () => {
    expect(yearSundays(2028, "en")).toHaveLength(53);
    expect(yearSundays(2028, "en").at(-1)?.date).toBe("2028-12-31");
    for (const value of [NaN, 1999, 2101, 2027.5]) {
      expect(validPlanningYear(value)).toBe(false);
      expect(() => yearSundays(value, "tl")).toThrow();
    }
  });

  it("creates drafts with closed availability and makes duplicate requests harmless", async () => {
    expect(await planYear(database, 2027, "tl")).toEqual({ months: 12, sundays: 52 });
    expect(await planYear(database, 2027, "en", true)).toEqual({ months: 0, sundays: 0 });
    const months = await db.select().from(schema.months);
    const services = await db.select().from(schema.services);
    expect(months.every((month) => !month.availabilityOpen)).toBe(true);
    expect(services.every((service) => service.status === "draft")).toBe(true);
    expect(services.find((service) => service.date === "2027-01-03")?.language).toBe("tl");
  });

  it("fills a partially planned year without changing existing people, songs, or month settings", async () => {
    await db.insert(schema.months).values({ id: "2027-01", theme: "Keep this theme", availabilityOpen: false });
    const [member] = await db.insert(schema.members).values({ name: "Test member" }).returning();
    const [service] = await db.insert(schema.services).values({ date: "2027-01-03", monthId: "2027-01", language: "en", status: "published", notes: "Keep these notes" }).returning();
    await db.insert(schema.serviceSongs).values({ serviceId: service.id, position: 0, title: "Existing song" });
    await db.insert(schema.assignments).values({ serviceId: service.id, memberId: member.id, role: "joyful" });
    expect(await planYear(database, 2027, "tl", true)).toEqual({ months: 11, sundays: 51 });
    const [kept] = await db.select().from(schema.services).where(eq(schema.services.id, service.id));
    expect(kept).toEqual(service);
    expect((await db.select().from(schema.serviceSongs))[0].title).toBe("Existing song");
    expect((await db.select().from(schema.assignments))[0].memberId).toBe(member.id);
    expect((await db.select().from(schema.months).where(eq(schema.months.id, "2027-01")))[0]).toMatchObject({ theme: "Keep this theme", availabilityOpen: false });
    expect((await db.select().from(schema.services).where(eq(schema.services.date, "2027-01-10")))[0].language).toBe("tl");
  });

  it("keeps concurrent duplicate requests from duplicating Sundays", async () => {
    await Promise.all([planYear(database, 2027, "tl"), planYear(database, 2027, "tl")]);
    expect(await db.select().from(schema.months)).toHaveLength(12);
    expect(await db.select().from(schema.services)).toHaveLength(52);
  });
});

describe("shared lineup revision", () => {
  it("is stable for reads and detects all member-visible data changes, including deletes", async () => {
    let revision = await getLineupRevision(database);
    expect(await getLineupRevision(database)).toBe(revision);
    const changed = async () => {
      const next = await getLineupRevision(database);
      expect(next).not.toBe(revision);
      expect(await getLineupRevision(database)).toBe(next);
      revision = next;
    };
    await db.insert(schema.months).values({ id: "2027-01" }); await changed();
    const [service] = await db.insert(schema.services).values({ date: "2027-01-03", monthId: "2027-01", language: "tl" }).returning(); await changed();
    const [member] = await db.insert(schema.members).values({ name: "Test member" }).returning(); await changed();
    const [song] = await db.insert(schema.serviceSongs).values({ serviceId: service.id, position: 0, title: "Song A" }).returning(); await changed();
    await db.update(schema.serviceSongs).set({ title: "Song B" }).where(eq(schema.serviceSongs.id, song.id)); await changed();
    await db.insert(schema.assignments).values({ serviceId: service.id, memberId: member.id, role: "joyful" }); await changed();
    await db.update(schema.services).set({ notes: "New notes", status: "published" }).where(eq(schema.services.id, service.id)); await changed();
    await db.update(schema.months).set({ theme: "New theme", availabilityOpen: true }).where(eq(schema.months.id, "2027-01")); await changed();
    await db.update(schema.members).set({ name: "Renamed member" }).where(eq(schema.members.id, member.id)); await changed();
    await db.insert(schema.availability).values({ memberId: member.id, serviceId: service.id, answer: "yes" }); await changed();
    await db.insert(schema.availabilityNotes).values({ memberId: member.id, monthId: "2027-01", songIdea: "Another song" }); await changed();
    await db.delete(schema.serviceSongs).where(eq(schema.serviceSongs.id, song.id)); await changed();
    await db.delete(schema.assignments); await changed();
  });
});
