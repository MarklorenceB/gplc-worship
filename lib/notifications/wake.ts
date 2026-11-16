import "server-only";
import { after } from "next/server";
import { getDb } from "../db/client";
import { pushConfig } from "./config";
import { drainPending, observeLineup } from "./engine";

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
