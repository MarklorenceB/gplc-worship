import "server-only";
import { after } from "next/server";
import { getDb } from "../db/client";
import { pushConfig } from "./config";
import { drainPending, observeLineup } from "./engine";

/** The durable queue is already committed; the scheduler retries if this fast path fails. */
export function wakeAnnouncementNotifications() {
  if (!pushConfig()) return;
  after(async () => {
    try { await drainPending(await getDb()); }
    catch { console.error("Announcement dispatch deferred to the scheduler."); }
  });
}

/** Fast-path for publish. The regular scheduler remains the durable recovery path. */
export function wakeLineupNotifications(serviceId: number) {
  if (!pushConfig()) return;
  after(async () => {
    try {
      const db = await getDb();
      await observeLineup(db, serviceId);
      await drainPending(db);
    } catch { console.error("Notification dispatch deferred to the scheduler."); }
  });
}
