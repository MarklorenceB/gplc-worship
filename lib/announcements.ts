import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import type { Db } from "./db/client";
import { announcements, notificationDeliveries, notificationEvents } from "./db/schema";
import { queueAnnouncement } from "./notifications/engine";

export const ANNOUNCEMENT_TITLE_LIMIT = 100;
export const ANNOUNCEMENT_BODY_LIMIT = 3000;
export const ANNOUNCEMENTS_PER_PAGE = 20;
export type Announcement = typeof announcements.$inferSelect;

export function validAnnouncementId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function announcementError(title: string, body: string) {
  if (!title.trim() || !body.trim()) return "Add a title and message before publishing.";
  if (title.trim().length > ANNOUNCEMENT_TITLE_LIMIT) return `Keep the title within ${ANNOUNCEMENT_TITLE_LIMIT} characters.`;
  if (body.trim().length > ANNOUNCEMENT_BODY_LIMIT) return `Keep the message within ${ANNOUNCEMENT_BODY_LIMIT} characters.`;
  return null;
}

/** A stable request ID makes double taps and retries safe, including concurrent requests. */
export async function publishAnnouncement(db: Db, input: {
  id: string; authorId: number; authorName: string; title: string; body: string;
}, now = new Date()) {
  const error = announcementError(input.title, input.body);
  if (!validAnnouncementId(input.id) || error) throw new Error(error ?? "Invalid announcement ID");
  const values = { ...input, title: input.title.trim(), body: input.body.trim(), createdAt: now };
  return db.transaction(async tx => {
    const [inserted] = await tx.insert(announcements).values(values).onConflictDoNothing().returning();
    if (inserted) {
      await queueAnnouncement(tx, inserted);
      return inserted;
    }
    const [existing] = await tx.select().from(announcements).where(eq(announcements.id, input.id));
    if (!existing || existing.authorId !== input.authorId || existing.title !== values.title || existing.body !== values.body) {
      throw new Error("This form was already submitted. Open a new announcement to post another message.");
    }
    return existing;
  });
}

export async function setAnnouncementArchived(db: Db, id: string, archived: boolean, now = new Date()) {
  if (!validAnnouncementId(id)) return;
  await db.transaction(async tx => {
    await tx.update(announcements).set({ archivedAt: archived ? now : null }).where(eq(announcements.id, id));
    if (archived) {
      const eventIds = tx.select({ id: notificationEvents.id }).from(notificationEvents).where(eq(notificationEvents.announcementId, id));
      await tx.update(notificationDeliveries).set({ status: "cancelled", lease: null })
        .where(and(eq(notificationDeliveries.status, "pending"), inArray(notificationDeliveries.eventId, eventIds)));
    }
  });
}

export async function listAnnouncements(db: Db, { archived = false, limit = ANNOUNCEMENTS_PER_PAGE, offset = 0 } = {}) {
  return db.select().from(announcements).where(archived ? isNotNull(announcements.archivedAt) : isNull(announcements.archivedAt))
    .orderBy(desc(announcements.createdAt), desc(announcements.id)).limit(limit).offset(offset);
}

export function announcementPage(value: string | string[] | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 && page <= 10000 ? page : 1;
}
