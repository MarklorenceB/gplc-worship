import { and, eq, sql } from "drizzle-orm";
import type { Db } from "./client";
import { months, notificationEvents, services } from "./schema";

export function validLineupMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function validLineupDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export class LineupChangedError extends Error {}

// Availability reminders reference a month in their URL rather than a foreign key.
async function removeMonthReminders(db: Pick<Db, "delete">, monthId: string) {
  await db.delete(notificationEvents).where(and(
    eq(notificationEvents.kind, "availability"),
    sql`${notificationEvents.payload}->>'url' = ${`/availability?month=${monthId}`}`,
  ));
}

export async function deleteSundayLineup(db: Db, serviceId: number, date: string) {
  if (!Number.isSafeInteger(serviceId) || serviceId < 1 || !validLineupDate(date)) throw new Error("Invalid lineup.");
  return db.transaction(async tx => {
    // Match both identity and date: an old form must not remove a replacement lineup.
    const [removed] = await tx.delete(services).where(and(eq(services.id, serviceId), eq(services.date, date)))
      .returning({ date: services.date, monthId: services.monthId });
    if (removed) await removeMonthReminders(tx, removed.monthId);
    // Foreign keys remove songs, assignments, answers, notification state, and
    // lineup notification events/deliveries together with the Sunday.
    return removed ?? null;
  });
}

export async function deleteMonthLineups(db: Db, monthId: string, expectedServiceIds: number[]) {
  if (!validLineupMonth(monthId) || expectedServiceIds.some(id => !Number.isSafeInteger(id) || id < 1)) {
    throw new Error("Invalid month.");
  }
  return db.transaction(async tx => {
    const [month] = await tx.select({ id: months.id }).from(months).where(eq(months.id, monthId)).for("update");
    if (!month) return null;
    const current = await tx.select({ id: services.id }).from(services).where(eq(services.monthId, monthId));
    const ids = (values: number[]) => [...values].sort((a, b) => a - b).join(",");
    if (ids(current.map(s => s.id)) !== ids(expectedServiceIds)) {
      throw new LineupChangedError("This month's Sundays changed. Reload and review them before deleting.");
    }
    await removeMonthReminders(tx, monthId);
    await tx.delete(months).where(eq(months.id, monthId));
    return { monthId, sundays: current.length };
  });
}
