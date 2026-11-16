import "server-only";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { monthOf, upcomingSunday } from "./dates";
import { getDb } from "./db/client";
import {
  assignments,
  availability,
  availabilityNotes,
  members,
  months,
  serviceSongs,
  services,
} from "./db/schema";
import { ROLES, serveCounts, type Answer, type Role } from "./lineup";

export type Member = typeof members.$inferSelect;
export type Month = typeof months.$inferSelect;
export type Song = typeof serviceSongs.$inferSelect;
export type Person = { assignmentId: number; memberId: number; name: string; role: Role };
export type Sunday = typeof services.$inferSelect & {
  month: Month;
  songs: Song[];
  people: Person[];
};

const roleOrder = (role: Role) => ROLES.indexOf(role);

async function withDetails(rows: (typeof services.$inferSelect)[]): Promise<Sunday[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id);
  const songRows = await db
    .select()
    .from(serviceSongs)
    .where(inArray(serviceSongs.serviceId, ids))
    .orderBy(asc(serviceSongs.position), asc(serviceSongs.id));
  const peopleRows = await db
    .select({
      assignmentId: assignments.id,
      serviceId: assignments.serviceId,
      memberId: assignments.memberId,
      role: assignments.role,
      position: assignments.position,
      name: members.name,
    })
    .from(assignments)
    .innerJoin(members, eq(members.id, assignments.memberId))
    .where(inArray(assignments.serviceId, ids))
    .orderBy(asc(assignments.position), asc(assignments.id));
  const monthRows = await db
    .select()
    .from(months)
    .where(inArray(months.id, [...new Set(rows.map((r) => r.monthId))]));
  const monthById = new Map(monthRows.map((m) => [m.id, m]));

  return rows.map((service) => ({
    ...service,
    month: monthById.get(service.monthId)!,
    songs: songRows.filter((s) => s.serviceId === service.id),
    people: peopleRows
      .filter((p) => p.serviceId === service.id)
      .sort((a, b) => roleOrder(a.role) - roleOrder(b.role) || a.position - b.position)
      .map(({ assignmentId, memberId, name, role }) => ({ assignmentId, memberId, name, role })),
  }));
}

export async function getSundaysBetween(from: string, to: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(services)
    .where(and(gte(services.date, from), lte(services.date, to)))
    .orderBy(asc(services.date));
  return withDetails(rows);
}

export async function getSundaysInMonth(monthId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(services)
    .where(eq(services.monthId, monthId))
    .orderBy(asc(services.date));
  return withDetails(rows);
}

export async function getSunday(date: string) {
  const db = await getDb();
  const rows = await db.select().from(services).where(eq(services.date, date));
  const [sunday] = await withDetails(rows);
  return sunday ?? null;
}

export async function listMonths() {
  const db = await getDb();
  return db.select().from(months).orderBy(asc(months.id));
}

export async function getMonth(monthId: string) {
  const db = await getDb();
  const [month] = await db.select().from(months).where(eq(months.id, monthId));
  return month ?? null;
}

/** The month to show by default: the month of the next Sunday, else the next planned one. */
export function pickMonth(all: Month[], today: string) {
  const current = monthOf(upcomingSunday(today));
  return (
    all.find((m) => m.id === current) ?? all.find((m) => m.id > current) ?? all.at(-1) ?? null
  );
}

export async function listMembers() {
  const db = await getDb();
  return db.select().from(members).orderBy(asc(members.name));
}

export async function getAnswers(serviceIds: number[]) {
  if (!serviceIds.length) return [];
  const db = await getDb();
  return db
    .select({
      memberId: availability.memberId,
      serviceId: availability.serviceId,
      answer: availability.answer,
    })
    .from(availability)
    .where(inArray(availability.serviceId, serviceIds));
}

export async function getMyAnswers(memberId: number, serviceIds: number[]) {
  if (!serviceIds.length) return new Map<number, Answer>();
  const db = await getDb();
  const rows = await db
    .select({ serviceId: availability.serviceId, answer: availability.answer })
    .from(availability)
    .where(and(eq(availability.memberId, memberId), inArray(availability.serviceId, serviceIds)));
  return new Map(rows.map((r) => [r.serviceId, r.answer]));
}

export async function getMonthNotes(monthId: string) {
  const db = await getDb();
  return db.select().from(availabilityNotes).where(eq(availabilityNotes.monthId, monthId));
}

export async function getMyNote(memberId: number, monthId: string) {
  const db = await getDb();
  const [note] = await db
    .select()
    .from(availabilityNotes)
    .where(and(eq(availabilityNotes.memberId, memberId), eq(availabilityNotes.monthId, monthId)));
  return note ?? null;
}

/** Sundays each member serves in a month. */
export async function getServeCounts(monthId: string) {
  const db = await getDb();
  const rows = await db
    .select({ serviceId: assignments.serviceId, memberId: assignments.memberId })
    .from(assignments)
    .innerJoin(services, eq(services.id, assignments.serviceId))
    .where(eq(services.monthId, monthId));
  return serveCounts(rows);
}
