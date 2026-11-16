"use client";

import { usePathname } from "next/navigation";
import { Suspense, useLayoutEffect, useRef, type RefObject } from "react";

export function AppMain({ children }: { children: React.ReactNode }) {
  const main = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    // Only the mobile workspace uses a contained scroller. Remove the lock when
    // signing out or when Next's Activity hides this layout.
    document.documentElement.classList.add("app-scroll-contained");
    return () => document.documentElement.classList.remove("app-scroll-contained");
  }, []);

  return (
    <main
      ref={main}
      id="main-content"
      className="app-main"
      tabIndex={-1}
    >
      {children}
      <Suspense fallback={null}><RestoreScroll container={main} /></Suspense>
    </main>
  );
}

function RestoreScroll({ container }: { container: RefObject<HTMLElement | null> }) {
  const pathname = usePathname();
  const positions = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const savedPositions = positions.current;
    // Keep the user's place when returning to a tab. Live data refreshes and
    // reopening the app do not change pathname and must not reset the scroller.
    // Next handles hash links (e.g. phone notifications) with scrollIntoView.
    if (window.matchMedia("(max-width: 1023px)").matches && !window.location.hash) {
      element.scrollTo({ top: savedPositions.get(pathname) ?? 0, behavior: "instant" });
    }
    let position = element.scrollTop;
    const remember = () => { position = element.scrollTop; };
    element.addEventListener("scroll", remember, { passive: true });
    return () => {
      // Remember the last scroll event, before a shorter route can clamp it.
      savedPositions.set(pathname, position);
      element.removeEventListener("scroll", remember);
    };
  }, [pathname, container]);

  return null;
}
