"use server";

import { and, asc, eq, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLeader } from "@/lib/auth";
import { getSunday } from "@/lib/data";
import { alternateLanguages, sundaysInMonth, type Language } from "@/lib/dates";
import { getDb } from "@/lib/db/client";
import { planYear, validPlanningYear } from "@/lib/db/plan-year";
import { assignments, members, months, serviceSongs, services } from "@/lib/db/schema";
import { BAND_SLOTS, isBandSlot, isRole, type BandSlot, type SongSet } from "@/lib/lineup";
import { reviewSunday } from "@/lib/review";
import { wakeLineupNotifications } from "@/lib/notifications/wake";

function id(value: FormDataEntryValue | null) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function text(value: FormDataEntryValue | null, maxLength = 200) {
  return String(value ?? "").trim().slice(0, maxLength) || null;
}

function language(value: FormDataEntryValue | null): Language | null {
  return value === "tl" || value === "en" ? value : null;
}

function refresh() {
  revalidatePath("/", "layout");
}

async function touch(serviceId: number) {
  const db = await getDb();
  await db.update(services).set({ updatedAt: sql`now()` }).where(eq(services.id, serviceId));
  wakeLineupNotifications(serviceId);
}

// Months

export async function setAvailabilityOpen(formData: FormData) {
  await requireLeader();
  const monthId = text(formData.get("monthId"));
  if (!monthId) return;
  const db = await getDb();
  await db
    .update(months)
    .set({ availabilityOpen: formData.get("open") === "1" })
    .where(eq(months.id, monthId));
  refresh();
}

export async function updateMonth(formData: FormData) {
  await requireLeader();
  const monthId = text(formData.get("monthId"));
  if (!monthId) return;
  const db = await getDb();
  await db
    .update(months)
    .set({ theme: text(formData.get("theme")), note: text(formData.get("note"), 300) })
    .where(eq(months.id, monthId));
  refresh();
}

export async function createMonth(formData: FormData) {
  await requireLeader();
  const monthId = text(formData.get("monthId"));
  const first = language(formData.get("firstLanguage")) ?? "tl";
  if (!monthId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthId)) return;
  const db = await getDb();
  const [existing] = await db.select().from(months).where(eq(months.id, monthId));
  if (existing) redirect(`/lead?year=${monthId.slice(0, 4)}#${monthId}`);

  const dates = sundaysInMonth(monthId);
  const languages = alternateLanguages(dates.length, first);
  await db.transaction(async (tx) => {
    await tx.insert(months).values({
      id: monthId,
      theme: text(formData.get("theme")),
      availabilityOpen: true,
    });
    await tx.insert(services).values(
      dates.map((date, i) => ({ date, monthId, language: languages[i], status: "draft" as const })),
    );
  });
  refresh();
  redirect(`/lead?year=${monthId.slice(0, 4)}#${monthId}`);
}

// Sunday details and status

export async function updateSundayDetails(formData: FormData) {
  await requireLeader();
  const serviceId = id(formData.get("serviceId"));
  const lang = language(formData.get("language"));
  if (!serviceId || !lang) return;
  const db = await getDb();
  await db
    .update(services)
    .set({
      language: lang,
      palette: text(formData.get("palette")),
      occasion: text(formData.get("occasion")),
      notes: text(formData.get("notes"), 1000),
      updatedAt: sql`now()`,
    })
    .where(eq(services.id, serviceId));
  wakeLineupNotifications(serviceId);
  refresh();
}

export async function setStatus(formData: FormData) {
  await requireLeader();
  const date = text(formData.get("date"));
  const status = formData.get("status");
  if (!date || (status !== "draft" && status !== "published")) return;
  const sunday = await getSunday(date);
  if (!sunday) return;
  if (status === "published" && !(await reviewSunday(sunday)).canPublish) return;
  const db = await getDb();
  await db
    .update(services)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(services.id, sunday.id));
  wakeLineupNotifications(sunday.id);
  refresh();
}

// Songs

export async function addSong(formData: FormData) {
  await requireLeader();
  const serviceId = id(formData.get("serviceId"));
  const title = text(formData.get("title"));
  if (!serviceId || !title) return;
  const part = String(formData.get("part") ?? "");
  const db = await getDb();
  const [{ last }] = await db
    .select({ last: max(serviceSongs.position) })
    .from(serviceSongs)
    .where(eq(serviceSongs.serviceId, serviceId));
  await db.insert(serviceSongs).values({
    serviceId,
    title,
    artist: text(formData.get("artist")),
    set: part === "joyful" || part === "solemn" ? (part as SongSet) : null,
    isBackup: part === "backup",
    position: (last ?? -1) + 1,
  });
  await touch(serviceId);
  refresh();
}

export async function setSongPart(formData: FormData) {
  await requireLeader();
  const songId = id(formData.get("songId"));
  if (!songId) return;
  const part = String(formData.get("part") ?? "");
  const db = await getDb();
  const [song] = await db
    .update(serviceSongs)
    .set({
      set: part === "joyful" || part === "solemn" ? (part as SongSet) : null,
      isBackup: part === "backup",
    })
    .where(eq(serviceSongs.id, songId))
    .returning();
  if (song) await touch(song.serviceId);
  refresh();
}

export async function removeSong(formData: FormData) {
  await requireLeader();
  const songId = id(formData.get("songId"));
  if (!songId) return;
  const db = await getDb();
  const [song] = await db.delete(serviceSongs).where(eq(serviceSongs.id, songId)).returning();
  if (song) await touch(song.serviceId);
  refresh();
}

export async function moveSong(formData: FormData) {
  await requireLeader();
  const songId = id(formData.get("songId"));
  const step = formData.get("direction") === "up" ? -1 : 1;
  if (!songId) return;
  const db = await getDb();
  const [song] = await db.select().from(serviceSongs).where(eq(serviceSongs.id, songId));
  if (!song) return;
  const list = await db
    .select()
    .from(serviceSongs)
    .where(eq(serviceSongs.serviceId, song.serviceId))
    .orderBy(asc(serviceSongs.position), asc(serviceSongs.id));
  const from = list.findIndex((s) => s.id === songId);
  const to = from + step;
  if (to < 0 || to >= list.length) return;
  [list[from], list[to]] = [list[to], list[from]];
  await db.transaction(async (tx) => {
    for (const [position, s] of list.entries()) {
      if (s.position !== position) {
        await tx.update(serviceSongs).set({ position }).where(eq(serviceSongs.id, s.id));
      }
    }
  });
  await touch(song.serviceId);
  refresh();
}

// People

export async function addPerson(formData: FormData) {
  await requireLeader();
  const serviceId = id(formData.get("serviceId"));
  const memberId = id(formData.get("memberId"));
  const role = String(formData.get("role") ?? "");
  if (!serviceId || !memberId || !isRole(role) || isBandSlot(role)) return;
  const db = await getDb();
  const [{ last }] = await db
    .select({ last: max(assignments.position) })
    .from(assignments)
    .where(eq(assignments.serviceId, serviceId));
  await db
    .insert(assignments)
    .values({ serviceId, memberId, role, position: (last ?? -1) + 1 })
    .onConflictDoNothing();
  await touch(serviceId);
  refresh();
}

export async function removePerson(formData: FormData) {
  await requireLeader();
  const assignmentId = id(formData.get("assignmentId"));
  if (!assignmentId) return;
  const db = await getDb();
  const [removed] = await db
    .delete(assignments)
    .where(eq(assignments.id, assignmentId))
    .returning();
  if (removed) await touch(removed.serviceId);
  refresh();
}

/** Band and sound slots hold one person each. */
export async function setSlot(formData: FormData) {
  await requireLeader();
  const serviceId = id(formData.get("serviceId"));
  const slot = String(formData.get("slot") ?? "");
  const memberId = id(formData.get("memberId"));
  if (!serviceId || !isBandSlot(slot)) return;
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx
      .delete(assignments)
      .where(and(eq(assignments.serviceId, serviceId), eq(assignments.role, slot)));
    if (memberId) {
      await tx.insert(assignments).values({
        serviceId,
        memberId,
        role: slot,
        position: 100 + BAND_SLOTS.indexOf(slot),
      });
    }
  });
  await touch(serviceId);
  refresh();
}

// Team

function instrumentsFrom(formData: FormData) {
  return formData
    .getAll("instruments")
    .map(String)
    .filter((v): v is BandSlot => isBandSlot(v));
}

export async function addMember(formData: FormData) {
  await requireLeader();
  const name = text(formData.get("name"), 60);
  if (!name) return;
  const db = await getDb();
  const inserted = await db
    .insert(members)
    .values({ name, sings: formData.get("sings") === "on", instruments: instrumentsFrom(formData) })
    .onConflictDoNothing()
    .returning();
  refresh();
  redirect(inserted.length ? `/lead/team?added=${inserted[0].id}` : "/lead/team?exists=1");
}

export async function updateMember(formData: FormData) {
  await requireLeader();
  const memberId = id(formData.get("memberId"));
  const name = text(formData.get("name"), 60);
  if (!memberId || !name) return;
  const db = await getDb();
  const [clash] = await db.select().from(members).where(eq(members.name, name));
  if (clash && clash.id !== memberId) redirect("/lead/team?exists=1");
  await db
    .update(members)
    .set({
      name,
      sings: formData.get("sings") === "on",
      instruments: instrumentsFrom(formData),
      active: formData.get("active") === "on",
    })
    .where(eq(members.id, memberId));
  refresh();
}

export type PlanYearState = { ok: boolean; message: string; year?: number } | undefined;

export async function createYear(_: PlanYearState, formData: FormData): Promise<PlanYearState> {
  await requireLeader();
  const rawYear = String(formData.get("year") ?? "");
  const year = Number(rawYear);
  const first = language(formData.get("firstLanguage"));
  if (!/^\d{4}$/.test(rawYear) || !validPlanningYear(year) || !first) {
    return { ok: false, message: "Choose a year from 2000 to 2100 and a starting language." };
  }
  try {
    const created = await planYear(await getDb(), year, first, formData.get("openAvailability") === "on");
    refresh();
    return {
      ok: true, year,
      message: created.sundays
        ? `${year} is ready: added ${created.months} months and ${created.sundays} draft Sundays. Existing plans were kept.`
        : `${year} is already planned. Your existing lineups were kept.`,
    };
  } catch (error) {
    console.error("Year planning failed", error);
    return { ok: false, message: "Couldn't create the year. Please try again; existing plans are kept." };
  }
}
