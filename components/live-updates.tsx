"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Status = "connected" | "updated" | "waiting" | "reconnecting";
const INTERVAL = 5_000;

export function LiveUpdates({ initialRevision }: { initialRevision: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const revision = useRef(initialRevision);
  const dirty = useRef(false);
  const [status, setStatus] = useState<Status>("connected");
  const [pending, startTransition] = useTransition();
  const refreshing = useRef(false);

  // A successful Server Action or route refresh acknowledges the rendered snapshot.
  useEffect(() => {
    revision.current = initialRevision;
    dirty.current = false;
  }, [initialRevision]);

  useEffect(() => { refreshing.current = pending; }, [pending]);

  useEffect(() => {
    dirty.current = false;
    let stopped = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;
    let failures = 0;

    function markDirty(event: Event) {
      if (event.target instanceof HTMLElement && event.target.closest("form")) dirty.current = true;
    }

    async function check() {
      clearTimeout(timer);
      if (stopped || inFlight) return;
      if (document.visibilityState !== "visible" || !navigator.onLine) {
        if (!navigator.onLine) setStatus("reconnecting");
        return; // Visibility/online events restart checks without polling a hidden tab.
      }
      inFlight = true;
      request = new AbortController();
      const timeout = setTimeout(() => request?.abort(), 10_000);
      try {
        const response = await fetch("/api/lineup-version", {
          cache: "no-store", credentials: "same-origin", signal: request.signal,
        });
        if (stopped) return;
        if (response.status === 401) {
          stopped = true;
          router.replace("/login");
          return;
        }
        if (!response.ok) throw new Error("Update check failed");
        const result: unknown = await response.json();
        if (!result || typeof result !== "object" || !("revision" in result) || typeof result.revision !== "string") {
          throw new Error("Invalid update version");
        }
        if (stopped) return;
        failures = 0;
        if (result.revision !== revision.current) {
          const editing = document.activeElement instanceof HTMLElement &&
            document.activeElement.matches("input, textarea, select, [contenteditable='true']");
          if (dirty.current || editing) {
            setStatus("waiting");
          } else if (!refreshing.current) {
            // Acknowledge only when the new server-rendered props arrive, so a
            // failed refresh is retried rather than silently missing the change.
            setStatus("updated");
            startTransition(() => router.refresh());
          }
        } else {
          setStatus("connected");
        }
      } catch {
        if (!stopped) {
          failures += 1;
          setStatus("reconnecting");
        }
      } finally {
        clearTimeout(timeout);
        inFlight = false;
        if (!stopped) timer = setTimeout(check, Math.min(INTERVAL * 2 ** failures, 30_000));
      }
    }

    document.addEventListener("input", markDirty);
    document.addEventListener("change", markDirty);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    void check();
    return () => {
      stopped = true;
      clearTimeout(timer);
      request?.abort();
      document.removeEventListener("input", markDirty);
      document.removeEventListener("change", markDirty);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, [pathname, search, router]);

  return (
    <p className={`live-status live-status-${status}`} role="status" aria-live="polite">
      <span aria-hidden="true" />
      {status === "waiting" ? "Updates are waiting while you edit. Save or leave this page to see them."
        : status === "reconnecting" ? "Reconnecting for team updates…"
        : status === "updated" ? "Updating team information…"
        : "Automatic team updates are on"}
    </p>
  );
}
