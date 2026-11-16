import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { pushSubscriptions } from "../db/schema";

export const DEVICE_COOKIE = "gplc_push_device";
export async function forgetCurrentPhone() {
  const jar = await cookies();
  const device = jar.get(DEVICE_COOKIE)?.value;
  if (device) {
    await (await getDb()).delete(pushSubscriptions).where(eq(pushSubscriptions.deviceId, device));
    jar.delete(DEVICE_COOKIE);
  }
}
