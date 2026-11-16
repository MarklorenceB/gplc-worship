import { and, gte, lte } from "drizzle-orm";
import { sundaysInMonth, type Language } from "../dates";
import type { Db } from "./client";
import { months, services } from "./schema";

export function validPlanningYear(year: number) {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

/** Existing services retain their details and anchor the following Sunday's language. */
export function yearSundays(year: number, firstLanguage: Language, existing: { date: string; language: Language }[] = []) {
  if (!validPlanningYear(year)) throw new Error("Choose a year from 2000 to 2100.");
  const known = new Map(existing.map((service) => [service.date, service.language]));
  let language = firstLanguage;
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`)
    .flatMap((monthId) => sundaysInMonth(monthId).map((date) => {
      const planned = { date, monthId, language: known.get(date) ?? language, status: "draft" as const };
      language = planned.language === "tl" ? "en" : "tl";
      return planned;
    }));
}

export async function planYear(db: Db, year: number, firstLanguage: Language, availabilityOpen = false) {
  if (!validPlanningYear(year)) throw new Error("Choose a year from 2000 to 2100.");
  return db.transaction(async (tx) => {
    // Unique constraints and a transaction make repeat/concurrent requests safe.
    const addedMonths = await tx.insert(months).values(
      Array.from({ length: 12 }, (_, index) => ({
        id: `${year}-${String(index + 1).padStart(2, "0")}`, availabilityOpen,
      })),
    ).onConflictDoNothing().returning({ id: months.id });
    const existing = await tx.select({ date: services.date, language: services.language }).from(services)
      .where(and(gte(services.date, `${year}-01-01`), lte(services.date, `${year}-12-31`)));
    const addedServices = await tx.insert(services).values(yearSundays(year, firstLanguage, existing))
      .onConflictDoNothing().returning({ id: services.id });
    return { months: addedMonths.length, sundays: addedServices.length };
  });
}
