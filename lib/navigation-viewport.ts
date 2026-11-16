const viewportBottomProperty = "--app-nav-viewport-bottom";

/** Keep mobile tabs attached to the visible screen after browser/app restoration. */
export function trackNavigationViewport(element: HTMLElement, win: Window = window) {
  const viewport = win.visualViewport;
  let frame = 0;
  let settleTimer = 0;

  const update = () => {
    frame = 0;
    // Background tabs can report a transient zero or an old keyboard viewport.
    if (win.document.visibilityState !== "visible") return;
    if (viewport && Math.abs(viewport.scale - 1) > 0.01) {
      // Let the browser handle pinch zoom without chasing the zoomed viewport.
      element.style.removeProperty(viewportBottomProperty);
      return;
    }
    const bottom = viewport ? viewport.offsetTop + viewport.height : win.innerHeight;
    if (Number.isFinite(bottom) && bottom > 0) {
      element.style.setProperty(viewportBottomProperty, `${bottom}px`);
    }
  };

  const schedule = () => {
    win.cancelAnimationFrame(frame);
    frame = win.requestAnimationFrame(update);
  };

  const restore = () => {
    win.clearTimeout(settleTimer);
    if (win.document.visibilityState !== "visible") {
      win.cancelAnimationFrame(frame);
      return;
    }
    schedule();
    // Mobile browser controls/keyboard can finish restoring after pageshow.
    settleTimer = win.setTimeout(schedule, 300);
  };

  update();
  win.addEventListener("resize", schedule);
  win.addEventListener("orientationchange", restore);
  win.addEventListener("pageshow", restore);
  win.addEventListener("focus", restore);
  win.document.addEventListener("visibilitychange", restore);
  viewport?.addEventListener("resize", schedule);
  viewport?.addEventListener("scroll", schedule);

  return () => {
    win.cancelAnimationFrame(frame);
    win.clearTimeout(settleTimer);
    win.removeEventListener("resize", schedule);
    win.removeEventListener("orientationchange", restore);
    win.removeEventListener("pageshow", restore);
    win.removeEventListener("focus", restore);
    win.document.removeEventListener("visibilitychange", restore);
    viewport?.removeEventListener("resize", schedule);
    viewport?.removeEventListener("scroll", schedule);
    element.style.removeProperty(viewportBottomProperty);
  };
}
