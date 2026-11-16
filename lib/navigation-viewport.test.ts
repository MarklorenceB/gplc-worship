import { afterEach, describe, expect, it, vi } from "vitest";
import { trackNavigationViewport } from "./navigation-viewport";

function browser() {
  vi.useFakeTimers();
  const document = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0, scale: 1 });
  const properties = new Map<string, string>();
  const element = {
    style: {
      setProperty: (key: string, value: string) => properties.set(key, value),
      removeProperty: (key: string) => properties.delete(key),
    },
  } as unknown as HTMLElement;
  const win = Object.assign(new EventTarget(), {
    document,
    visualViewport: viewport as typeof viewport | null,
    innerHeight: 844,
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 16),
    cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    setTimeout,
    clearTimeout,
  });
  return {
    win, document, viewport,
    bottom: () => properties.get("--app-nav-viewport-bottom"),
    start: () => trackNavigationViewport(element, win as unknown as Window),
  };
}

afterEach(() => vi.useRealTimers());

describe("mobile navigation viewport restoration", () => {
  it("ignores background measurements and corrects a stale keyboard height after reopening", () => {
    const b = browser();
    const stop = b.start();
    expect(b.bottom()).toBe("844px");

    b.document.visibilityState = "hidden";
    b.document.dispatchEvent(new Event("visibilitychange"));
    b.viewport.height = 0;
    b.viewport.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(20);
    expect(b.bottom()).toBe("844px");

    b.viewport.height = 480;
    b.document.visibilityState = "visible";
    b.document.dispatchEvent(new Event("visibilitychange"));
    vi.advanceTimersByTime(20);
    expect(b.bottom()).toBe("480px");
    // iOS may settle its viewport without dispatching another resize event.
    b.viewport.height = 844;
    vi.advanceTimersByTime(300);
    expect(b.bottom()).toBe("844px");
    stop();
  });

  it("follows keyboard and rotation changes including the visual viewport offset", () => {
    const b = browser();
    const stop = b.start();
    b.viewport.height = 440;
    b.viewport.offsetTop = 64;
    b.viewport.dispatchEvent(new Event("resize"));
    b.viewport.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(20);
    expect(b.bottom()).toBe("504px");

    b.viewport.height = 390;
    b.viewport.offsetTop = 0;
    b.win.dispatchEvent(new Event("orientationchange"));
    vi.advanceTimersByTime(320);
    expect(b.bottom()).toBe("390px");
    stop();
  });

  it("resynchronizes on pageshow and focus without overriding pinch zoom", () => {
    const b = browser();
    const stop = b.start();
    b.viewport.scale = 2;
    b.viewport.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(20);
    expect(b.bottom()).toBeUndefined();

    b.viewport.scale = 1;
    b.viewport.height = 780;
    b.win.dispatchEvent(new Event("pageshow"));
    vi.advanceTimersByTime(20);
    expect(b.bottom()).toBe("780px");
    b.viewport.height = 844;
    b.win.dispatchEvent(new Event("focus"));
    vi.advanceTimersByTime(320);
    expect(b.bottom()).toBe("844px");
    stop();
  });

  it("supports browsers without visualViewport and removes callbacks on unmount", () => {
    const b = browser();
    b.win.visualViewport = null;
    const stop = b.start();
    b.win.innerHeight = 700;
    b.win.dispatchEvent(new Event("resize"));
    vi.advanceTimersByTime(20);
    expect(b.bottom()).toBe("700px");
    b.win.dispatchEvent(new Event("pageshow"));
    stop();
    b.win.dispatchEvent(new Event("resize"));
    b.document.dispatchEvent(new Event("visibilitychange"));
    vi.runAllTimers();
    expect(b.bottom()).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});
