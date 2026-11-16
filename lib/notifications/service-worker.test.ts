import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

describe("push navigation", () => {
  it("opens announcement details and keeps untrusted destinations on the app", async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const openWindow = vi.fn().mockResolvedValue(undefined);
    runInNewContext(readFileSync("public/sw.js", "utf8"), { URL, self: {
      addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
      registration: { showNotification }, location: { origin: "https://gplc.example" },
      clients: { matchAll: async () => [], openWindow },
    } });
    const path = "/announcements/ebff4e71-33e2-468f-947a-92c513f09ad1";
    let work: Promise<unknown> = Promise.resolve();
    const waitUntil = (promise: Promise<unknown>) => { work = promise; };
    handlers.push({ data: { json: () => ({ title: "Rehearsal", url: path }) }, waitUntil });
    await work;
    expect(showNotification.mock.calls[0][1].data.url).toBe(path);
    handlers.notificationclick({ notification: { data: { url: path }, close: vi.fn() }, waitUntil });
    await work;
    expect(openWindow).toHaveBeenCalledWith(`https://gplc.example${path}`);
    handlers.push({ data: { json: () => ({ url: "https://other.example/steal" }) }, waitUntil });
    await work;
    expect(showNotification.mock.calls[1][1].data.url).toBe("/schedule");
  });
});
