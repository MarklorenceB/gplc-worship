import { describe, expect, it } from "vitest";
import {
  alternateLanguages,
  dateBlock,
  longDate,
  monthLabel,
  nextMonthId,
  shortDate,
  sundaysInMonth,
  todayISO,
  upcomingSunday,
} from "./dates";

describe("sundaysInMonth", () => {
  it("lists every Sunday of November 2026", () => {
    expect(sundaysInMonth("2026-11")).toEqual([
      "2026-11-01",
      "2026-11-08",
      "2026-11-15",
      "2026-11-22",
      "2026-11-29",
    ]);
  });

  it("lists every Sunday of December 2026", () => {
    expect(sundaysInMonth("2026-12")).toEqual([
      "2026-12-06",
      "2026-12-13",
      "2026-12-20",
      "2026-12-27",
    ]);
  });
});

describe("nextMonthId", () => {
  it("rolls over the year", () => {
    expect(nextMonthId("2026-12")).toBe("2027-01");
    expect(nextMonthId("2026-09")).toBe("2026-10");
  });
});

describe("alternateLanguages", () => {
  it("alternates starting from the given language", () => {
    expect(alternateLanguages(4, "tl")).toEqual(["tl", "en", "tl", "en"]);
    expect(alternateLanguages(3, "en")).toEqual(["en", "tl", "en"]);
  });
});

describe("todayISO", () => {
  it("uses the team's time zone, not UTC", () => {
    // 20:00 UTC on Oct 31 is already Nov 1 in Manila (UTC+8).
    const now = new Date("2026-10-31T20:00:00Z");
    expect(todayISO("Asia/Manila", now)).toBe("2026-11-01");
    expect(todayISO("UTC", now)).toBe("2026-10-31");
  });
});

describe("formatting", () => {
  it("formats dates without shifting the day", () => {
    expect(longDate("2026-11-08")).toBe("Sunday, November 8");
    expect(shortDate("2026-11-08")).toBe("Nov 8");
    expect(monthLabel("2026-11")).toBe("November 2026");
    expect(dateBlock("2026-11-08")).toEqual({ month: "Nov", day: "8" });
  });
});

describe("upcomingSunday", () => {
  it("finds the next Sunday, or today if it is Sunday", () => {
    expect(upcomingSunday("2026-10-29")).toBe("2026-11-01");
    expect(upcomingSunday("2026-11-01")).toBe("2026-11-01");
    expect(upcomingSunday("2026-12-28")).toBe("2027-01-03");
  });
});
