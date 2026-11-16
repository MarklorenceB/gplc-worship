"use client";

import { useEffect, useState } from "react";
import { disablePhone, enablePhone, inspectPhone, testPhone } from "@/app/(app)/me/notification-actions";
import { buttonClass, Card, Chip, SectionTitle } from "./ui";

type PhoneState = "loading" | "off" | "on" | "install" | "unsupported" | "blocked" | "insecure";
function applicationKey(key: string) {
  const bytes = atob(key.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(key.length / 4) * 4, "="));
  return Uint8Array.from(bytes, char => char.charCodeAt(0));
}

export function NotificationSettings({ publicKey, timeZone }: { publicKey: string | null; timeZone: string }) {
  const [state, setState] = useState<PhoneState>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    async function inspect() {
      if (!window.isSecureContext) return "insecure" as const;
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (ios && !window.matchMedia("(display-mode: standalone)").matches) return "install" as const;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported" as const;
      if (Notification.permission === "denied") return "blocked" as const;
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const subscription = await registration.pushManager.getSubscription();
      if (subscription && await inspectPhone(subscription.endpoint)) return "on" as const;
      return "off" as const;
    }
    inspect().then(next => { if (alive) setState(next); }).catch(() => {
      if (alive) { setState("off"); setMessage("Couldn't check this phone. Please try again."); }
    });
    return () => { alive = false; };
  }, []);

  async function enable() {
    if (!publicKey) return;
    setBusy(true); setMessage("");
    try {
      // Ask immediately from a tap; iOS requires a direct user gesture.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        setMessage("You can turn notifications on whenever you're ready."); return;
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      const desired = applicationKey(publicKey);
      if (subscription) {
        const existing = subscription.options.applicationServerKey;
        if (!existing || new Uint8Array(existing).some((byte, i) => byte !== desired[i]) || existing.byteLength !== desired.byteLength) {
          await subscription.unsubscribe(); subscription = null;
        }
      }
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: desired });
      const result = await enablePhone(subscription.toJSON());
      setMessage(result.message);
      if (result.ok) setState("on");
    } catch { setMessage("Couldn't enable notifications. Check your connection and browser permissions, then try again."); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      const result = await disablePhone(); // Stop the server first, even if the browser subscription is stale.
      setState("off"); setMessage(result.message);
      const registration = await navigator.serviceWorker.getRegistration("/");
      await (await registration?.pushManager.getSubscription())?.unsubscribe();
    } catch { setMessage("Couldn't finish turning notifications off. Please try again."); }
    finally { setBusy(false); }
  }

  async function test() {
    setBusy(true);
    try { setMessage((await testPhone()).message); }
    catch { setMessage("Couldn't send the test. Please try again."); }
    finally { setBusy(false); }
  }

  return <Card className="grid-full" as="section">
    <span id="phone-notifications" className="scroll-mt-6" />
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[11px] font-bold uppercase tracking-widest text-primary">Stay in the loop</p>
        <SectionTitle>Phone notifications</SectionTitle></div>
      <Chip tone={state === "on" ? "ok" : "neutral"}>{state === "on" ? "On for this phone" : "Set up this phone"}</Chip>
    </div>
    <p className="max-w-2xl text-[15px] text-muted">Get the latest lineup and a reminder when you&apos;re serving, even when the app is closed.</p>
    <ul className="my-4 grid gap-2 text-[14px] sm:grid-cols-3">
      <li className="rounded-2xl bg-ground p-3"><strong className="block">Lineup alerts</strong>Newly published lineups and saved changes.</li>
      <li className="rounded-2xl bg-ground p-3"><strong className="block">Saturday · 6 PM</strong>A reminder if you&apos;re serving on Sunday.</li>
      <li className="rounded-2xl bg-ground p-3"><strong className="block">Wednesday · 6 PM</strong>A nudge if your availability is unfinished.</li>
    </ul>
    <p className="mb-4 text-[12px] text-muted">Times are in {timeZone.replaceAll("_", " ")}; scheduled reminders may arrive up to an hour later. Set this up on each phone you use.</p>
    {!publicKey && <p className="mb-3 rounded-2xl bg-primary-soft p-3 text-[14px]">Phone notifications are being prepared. You can keep checking Schedule in the meantime.</p>}
    {state === "install" && <div className="rounded-2xl bg-primary-soft p-4 text-[15px]"><strong>One quick step on iPhone</strong><p>In Safari, tap Share → Add to Home Screen. Open GPLC Worship from its new icon, sign in, then return here to enable notifications. Requires iOS 16.4 or newer.</p></div>}
    {state === "insecure" && <p className="text-[15px] text-muted">Open the team&apos;s secure HTTPS link to enable phone notifications. A local Wi-Fi HTTP address won&apos;t work.</p>}
    {state === "unsupported" && <p className="text-[15px] text-muted">This browser doesn&apos;t support phone notifications. Try an up-to-date Chrome on Android or the Home Screen app on iPhone.</p>}
    {state === "blocked" && <p className="text-[15px] text-muted">Notifications are blocked. Allow them in your browser or phone notification settings, then reopen this page.</p>}
    {state === "loading" && <p className="text-muted">Checking this phone…</p>}
    {(state === "on" || state === "off") && <div className="flex flex-wrap gap-2">
      {state === "on" ? <><button type="button" className={buttonClass()} disabled={busy || !publicKey} onClick={test}>Send me a test</button>
        <button type="button" className={buttonClass("secondary")} disabled={busy} onClick={disable}>Turn off on this phone</button></> :
        <button type="button" className={buttonClass()} disabled={busy || !publicKey} onClick={enable}>{busy ? "Setting up…" : "Enable notifications"}</button>}
    </div>}
    <p role="status" aria-live="polite" className="mt-3 text-[14px] font-semibold text-primary">{message}</p>
    <p className="mt-2 text-[12px] text-muted">You control permission. Signing out stops notifications on this phone. Internet access and phone notification settings affect delivery.</p>
  </Card>;
}
