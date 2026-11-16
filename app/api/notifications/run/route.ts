import { getDb } from "@/lib/db/client";
import { authorizedScheduler, pushConfig } from "@/lib/notifications/config";
import { runNotificationCycle } from "@/lib/notifications/engine";

export const maxDuration = 60;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!authorizedScheduler(request.headers.get("authorization"))) return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  if (!pushConfig()) return Response.json({ error: "Push notifications are not configured" }, { status: 503, headers });
  try { return Response.json(await runNotificationCycle(await getDb()), { headers }); }
  catch { return Response.json({ error: "Notification run failed; retry on the next tick" }, { status: 500, headers }); }
}
export const POST = GET;
