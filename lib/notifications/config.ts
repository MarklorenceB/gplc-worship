import { timingSafeEqual } from "node:crypto";

export function pushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  if (Buffer.from(publicKey, "base64url").length !== 65 || Buffer.from(privateKey, "base64url").length !== 32) return null;
  try {
    const url = new URL(subject);
    if (!(url.protocol === "mailto:" || (url.protocol === "https:" && url.hostname !== "localhost"))) return null;
  } catch { return null; }
  return { publicKey, privateKey, subject };
}

export function authorizedScheduler(authorization: string | null, secret = process.env.CRON_SECRET) {
  if (!secret || secret.length < 32 || !authorization) return false;
  const actual = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export type BrowserSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

// Endpoints are supplied by browsers but arrive as untrusted request input.
// Restrict outgoing requests to known push providers, never arbitrary URLs.
export function validSubscription(input: unknown): input is BrowserSubscription {
  if (!input || typeof input !== "object") return false;
  const value = input as Partial<BrowserSubscription>;
  if (typeof value.endpoint !== "string" || value.endpoint.length > 4096 || !value.keys) return false;
  try {
    const url = new URL(value.endpoint);
    const host = url.hostname;
    const trusted = host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
      host.endsWith(".push.services.mozilla.com") || host === "web.push.apple.com" ||
      host.endsWith(".push.apple.com") || host.endsWith(".notify.windows.com");
    if (!trusted || url.protocol !== "https:" || url.port || url.username || url.password || url.hash) return false;
    return [[value.keys.p256dh, 65], [value.keys.auth, 16]].every(([key, length]) =>
      typeof key === "string" && /^[A-Za-z0-9_-]+={0,2}$/.test(key) &&
      Buffer.from(key, "base64url").length === length);
  } catch { return false; }
}
