"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLeader } from "@/lib/auth";
import { announcementError, publishAnnouncement, setAnnouncementArchived, validAnnouncementId } from "@/lib/announcements";
import { getDb } from "@/lib/db/client";
import { wakeAnnouncementNotifications } from "@/lib/notifications/wake";

export type AnnouncementState = { error: string; title: string; body: string } | undefined;

export async function publishTeamAnnouncement(_: AnnouncementState, form: FormData): Promise<AnnouncementState> {
  const viewer = await requireLeader();
  const id = String(form.get("id") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  const error = announcementError(title, body);
  if (error || !validAnnouncementId(id)) return { error: error ?? "Reload this page and try again.", title, body };
  try {
    await publishAnnouncement(await getDb(), { id, title, body, authorId: viewer.id, authorName: viewer.name });
  } catch {
    return { error: "We couldn't publish this announcement. Your message is still here. Retry, or copy it and open a new announcement.", title, body };
  }
  wakeAnnouncementNotifications();
  revalidatePath("/", "layout");
  redirect(`/announcements/${id}`);
}

export async function archiveTeamAnnouncement(form: FormData) {
  await requireLeader();
  const id = String(form.get("id") ?? "");
  if (!validAnnouncementId(id)) return;
  await setAnnouncementArchived(await getDb(), id, form.get("archived") === "1");
  revalidatePath("/", "layout");
}
