"use server";

import { randomUUID } from "node:crypto";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { pushSubscriptions } from "@/lib/db/schema";
import { pushConfig, validSubscription } from "@/lib/notifications/config";
import { DEVICE_COOKIE, forgetCurrentPhone } from "@/lib/notifications/device";
import { sendPush } from "@/lib/notifications/engine";

export async function inspectPhone(endpoint: string) {
  const viewer = await requireViewer();
  const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!deviceId) return false;
  const [phone] = await (await getDb()).select({ id: pushSubscriptions.id }).from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.deviceId, deviceId), eq(pushSubscriptions.memberId, viewer.id), eq(pushSubscriptions.endpoint, endpoint)));
  return !!phone;
}

export async function enablePhone(input: unknown) {
  const viewer = await requireViewer();
  if (!pushConfig()) return { ok: false, message: "Phone notifications are still being set up. Please try again later." };
  if (!validSubscription(input)) return { ok: false, message: "This browser's notification service isn't supported. Try Safari or Chrome." };
  const jar = await cookies();
  const deviceId = jar.get(DEVICE_COOKIE)?.value ?? randomUUID();
  const db = await getDb();
  const phones = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(eq(pushSubscriptions.memberId, viewer.id));
  if (phones.length >= 10 && !(await inspectPhone(input.endpoint))) return { ok: false, message: "You already have 10 devices enabled. Ask a leader for help." };
  await db.transaction(async tx => {
    // Delete old deliveries as well when a shared phone switches to another member.
    await tx.delete(pushSubscriptions).where(or(eq(pushSubscriptions.deviceId, deviceId), eq(pushSubscriptions.endpoint, input.endpoint)));
    await tx.insert(pushSubscriptions).values({ deviceId, memberId: viewer.id, endpoint: input.endpoint,
      p256dh: input.keys.p256dh, auth: input.keys.auth });
  });
  jar.set(DEVICE_COOKIE, deviceId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 180 * 86400 });
  revalidatePath("/lead/notifications");
  return { ok: true, message: "Notifications are on for this phone. Try sending yourself a test." };
}

export async function disablePhone() {
  await requireViewer();
  await forgetCurrentPhone();
  revalidatePath("/lead/notifications");
  return { ok: true, message: "Notifications are off for this phone." };
}

export async function testPhone() {
  const viewer = await requireViewer();
  if (!pushConfig()) return { ok: false, message: "Phone notifications are still being set up." };
  const deviceId = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!deviceId) return { ok: false, message: "Enable notifications on this phone first." };
  const db = await getDb();
  const [phone] = await db.update(pushSubscriptions).set({ lastTestAt: new Date() }).where(and(
    eq(pushSubscriptions.deviceId, deviceId), eq(pushSubscriptions.memberId, viewer.id),
    or(sql`${pushSubscriptions.lastTestAt} is null`, lt(pushSubscriptions.lastTestAt, new Date(Date.now() - 60_000))),
  )).returning();
  if (!phone) return { ok: false, message: "Please wait a minute between test notifications, or enable this phone first." };
  try {
    await sendPush({ endpoint: phone.endpoint, keys: { p256dh: phone.p256dh, auth: phone.auth } },
      { title: "You're connected, team!", body: "GPLC lineup reminders can now reach this phone. Tap to open your profile.", url: "/me", tag: "gplc-test" }, 60);
    return { ok: true, message: "Test sent to your phone's push service. Check your notifications." };
  } catch (error) {
    const status = error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 0;
    if (status === 404 || status === 410) {
      await forgetCurrentPhone();
      return { ok: false, message: "This phone's subscription expired. Turn notifications off, then enable them again." };
    }
    return { ok: false, message: "The notification service couldn't send the test. Please try again later." };
  }
}
