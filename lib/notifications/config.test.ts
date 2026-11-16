import { describe, expect, it } from "vitest";
import { authorizedScheduler, validSubscription } from "./config";
import { reminderWindow } from "./clock";

describe("phone notification boundaries", () => {
  const keys = { p256dh: Buffer.alloc(65, 1).toString("base64url"), auth: Buffer.alloc(16, 2).toString("base64url") };
  it("only accepts secure endpoints from push providers", () => {
    for (const endpoint of ["https://fcm.googleapis.com/fcm/send/device", "https://web.push.apple.com/Q/device", "https://updates.push.services.mozilla.com/wpush/v2/device"]) {
      expect(validSubscription({ endpoint, keys })).toBe(true);
    }
    for (const endpoint of ["http://fcm.googleapis.com/x", "https://127.0.0.1/x", "https://localhost/x", "https://fcm.googleapis.com.evil.test/x", "https://example.com/x", "https://fcm.googleapis.com:444/x", "https://user:secret@fcm.googleapis.com/x"]) {
      expect(validSubscription({ endpoint, keys })).toBe(false);
    }
    expect(validSubscription({ endpoint: "https://fcm.googleapis.com/x", keys: { ...keys, auth: "short" } })).toBe(false);
    expect(validSubscription(null)).toBe(false);
  });
  it("fails closed when scheduler credentials are missing or invalid", () => {
    const secret = "s".repeat(32);
    expect(authorizedScheduler(`Bearer ${secret}`, secret)).toBe(true);
    expect(authorizedScheduler(null, secret)).toBe(false);
    expect(authorizedScheduler("Bearer undefined", "")).toBe(false);
    expect(authorizedScheduler("Bearer short", "short")).toBe(false);
    expect(authorizedScheduler(`Bearer ${"a".repeat(32)}`, secret)).toBe(false);
  });
  it("uses Philippine Saturday evening and handles a year boundary", () => {
    expect(reminderWindow(new Date("2026-11-21T09:59:59Z"), "Asia/Manila").sunday).toBe(false);
    const evening = reminderWindow(new Date("2026-11-21T10:00:00Z"), "Asia/Manila");
    expect(evening).toMatchObject({ date: "2026-11-21", tomorrow: "2026-11-22", sunday: true, availability: false });
    expect(evening.expiresAt.toISOString()).toBe("2026-11-21T16:00:00.000Z");
    expect(reminderWindow(new Date("2026-11-21T16:00:00Z"), "Asia/Manila").sunday).toBe(false);
    expect(reminderWindow(new Date("2033-12-31T10:00:00Z"), "Asia/Manila")).toMatchObject({ sunday: true, tomorrow: "2034-01-01" });
    expect(reminderWindow(new Date("2026-11-18T10:00:00Z"), "Asia/Manila").availability).toBe(true);
  });
});
