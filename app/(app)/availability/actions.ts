"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { shortDate, todayISO } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { availability, availabilityNotes, months, services } from "@/lib/db/schema";
import type { Answer } from "@/lib/lineup";
import { OPEN_TO_OPTIONS } from "./options";

export type SaveState = { ok: boolean; message: string; at: number } | undefined;

const ANSWERS: Answer[] = ["yes", "maybe", "no"];

export async function saveAvailability(_: SaveState, formData: FormData): Promise<SaveState> {
  const viewer = await requireViewer();
  const monthId = String(formData.get("monthId") ?? "");
  const db = await getDb();

  const [month] = await db.select().from(months).where(eq(months.id, monthId));
  if (!month?.availabilityOpen) {
    return { ok: false, message: "This month is closed for availability. Ask a leader.", at: Date.now() };
  }

  const sundays = await db
    .select({ id: services.id, date: services.date })
    .from(services)
    .where(and(eq(services.monthId, monthId), gte(services.date, todayISO())));

  const answered = sundays.flatMap((s) => {
    const value = formData.get(`answer-${s.id}`);
    return ANSWERS.includes(value as Answer) ? [{ serviceId: s.id, answer: value as Answer }] : [];
  });

  const allowed = OPEN_TO_OPTIONS.map((o) => o.value) as string[];
  const openTo = formData.getAll("openTo").map(String).filter((v) => allowed.includes(v));
  const songIdea = String(formData.get("songIdea") ?? "").trim().slice(0, 200) || null;
  const tryLead = formData.get("tryLead") === "on";

  await db.transaction(async (tx) => {
    if (answered.length) {
      await tx
        .insert(availability)
        .values(answered.map((a) => ({ ...a, memberId: viewer.id })))
        .onConflictDoUpdate({
          target: [availability.memberId, availability.serviceId],
          set: { answer: sql`excluded.answer`, updatedAt: sql`now()` },
        });
    }
    await tx
      .insert(availabilityNotes)
      .values({ memberId: viewer.id, monthId, openTo, tryLead, songIdea })
      .onConflictDoUpdate({
        target: [availabilityNotes.memberId, availabilityNotes.monthId],
        set: { openTo, tryLead, songIdea, updatedAt: sql`now()` },
      });
  });

  revalidatePath("/", "layout");

  const answeredIds = new Set(answered.map((a) => a.serviceId));
  const missing = sundays.filter((s) => !answeredIds.has(s.id)).map((s) => shortDate(s.date));
  return missing.length
    ? { ok: true, message: `Saved. You haven't answered ${missing.join(", ")} yet.`, at: Date.now() }
    : { ok: true, message: `Sent. Salamat, ${viewer.name}!`, at: Date.now() };
}
