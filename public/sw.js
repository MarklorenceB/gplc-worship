/* Push only: authenticated pages and lineup data are never cached offline. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("push", event => {
  let message = {};
  try { message = event.data?.json() || {}; } catch { /* Show a safe fallback for malformed pushes. */ }
  const url = typeof message.url === "string" && /^\/(sunday\/\d{4}-\d{2}-\d{2}|availability(?:\?month=\d{4}-\d{2})?|me)$/.test(message.url) ? message.url : "/schedule";
  event.waitUntil(self.registration.showNotification(message.title || "GPLC Worship", {
    body: message.body || "There's an update for the team. Tap to view the lineup.",
    icon: "/icons/icon-192.png", badge: "/icons/badge-96.png",
    tag: message.tag || "gplc-update", data: { url },
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/schedule", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find(client => new URL(client.url).origin === target.origin);
    if (existing) { await existing.navigate(target.href); await existing.focus(); }
    else await self.clients.openWindow(target.href);
  })());
});
