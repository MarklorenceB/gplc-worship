import { describe, expect, it } from "vitest";
import {
  checkLineup,
  groupChatText,
  lineupChecklist,
  ordinal,
  serveCounts,
} from "./lineup";

const names = new Map([
  [1, "Andoy"],
  [2, "Kim"],
  [3, "Faye"],
  [4, "Don"],
  [5, "Lorence"],
]);

describe("serveCounts", () => {
  it("counts distinct Sundays, not roles", () => {
    const counts = serveCounts([
      { serviceId: 10, memberId: 1 },
      { serviceId: 10, memberId: 1 },
      { serviceId: 11, memberId: 1 },
      { serviceId: 11, memberId: 2 },
    ]);
    expect(counts.get(1)).toBe(2);
    expect(counts.get(2)).toBe(1);
    expect(counts.get(3)).toBeUndefined();
  });
});

describe("checkLineup", () => {
  it("flags one person in two band or tech slots", () => {
    const issues = checkLineup({
      assignments: [
        { memberId: 1, role: "AD" },
        { memberId: 1, role: "ST" },
        { memberId: 2, role: "LG" },
      ],
      answers: new Map(),
      monthCounts: new Map(),
      names,
    });
    expect(issues).toEqual([
      {
        kind: "conflict",
        level: "error",
        memberId: 1,
        message: "Andoy is on drums and sound tech",
      },
    ]);
  });

  it("allows singing and playing on the same Sunday", () => {
    const issues = checkLineup({
      assignments: [
        { memberId: 5, role: "backup" },
        { memberId: 5, role: "AG" },
      ],
      answers: new Map(),
      monthCounts: new Map(),
      names,
    });
    expect(issues).toEqual([]);
  });

  it("flags people who said they can't or aren't sure", () => {
    const issues = checkLineup({
      assignments: [
        { memberId: 3, role: "joyful" },
        { memberId: 2, role: "LG" },
        { memberId: 4, role: "BG" },
      ],
      answers: new Map([
        [3, "no"],
        [2, "maybe"],
        [4, "yes"],
      ]),
      monthCounts: new Map(),
      names,
    });
    expect(issues.map((i) => [i.kind, i.level, i.memberId])).toEqual([
      ["unavailable", "error", 3],
      ["unsure", "warn", 2],
    ]);
  });

  it("warns when someone would serve 3 or more Sundays in the month", () => {
    const issues = checkLineup({
      assignments: [
        { memberId: 4, role: "BG" },
        { memberId: 2, role: "LG" },
      ],
      answers: new Map(),
      monthCounts: new Map([
        [4, 3],
        [2, 2],
      ]),
      names,
    });
    expect(issues).toEqual([
      {
        kind: "heavy",
        level: "warn",
        memberId: 4,
        message: "Don would serve 3 Sundays this month",
      },
    ]);
  });

  it("reports each person once per kind even with several roles", () => {
    const issues = checkLineup({
      assignments: [
        { memberId: 5, role: "backup" },
        { memberId: 5, role: "AG" },
      ],
      answers: new Map([[5, "no"]]),
      monthCounts: new Map([[5, 4]]),
      names,
    });
    expect(issues.map((i) => i.kind)).toEqual(["unavailable", "heavy"]);
  });
});

describe("lineupChecklist", () => {
  it("marks what is still missing", () => {
    expect(
      lineupChecklist({
        songCount: 3,
        roles: ["joyful", "backup", "LG"],
      }),
    ).toEqual([
      { label: "Songs", done: true },
      { label: "Joyful leader", done: true },
      { label: "Solemn leader", done: false },
      { label: "Devotion", done: false },
    ]);
  });
});

describe("ordinal", () => {
  it("handles 1st to 4th and teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21].map(ordinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
    ]);
  });
});

describe("groupChatText", () => {
  it("matches the doc's lineup format", () => {
    const text = groupChatText({
      date: "2026-01-25",
      language: "en",
      theme: "Running with a Vision",
      palette: "Black and Cream",
      occasion: null,
      songs: [
        { title: "New Thing Coming", artist: null, set: "joyful", isBackup: false },
        { title: "Trust in God", artist: "Elevation Worship", set: "solemn", isBackup: false },
        { title: "Always on Time", artist: null, set: null, isBackup: true },
      ],
      people: [
        { role: "joyful", name: "Faye" },
        { role: "solemn", name: "Fea" },
        { role: "solemn", name: "Mina" },
        { role: "backup", name: "Anika" },
        { role: "LG", name: "Kim" },
        { role: "AD", name: "Andoy" },
        { role: "devotion", name: "Fea" },
        { role: "devotion", name: "Mina" },
        { role: "soaking", name: "Raymond" },
      ],
    });
    expect(text).toBe(
      [
        "Sunday, January 25 (English)",
        "Theme: Running with a Vision",
        "",
        "Songs",
        "🎵 New Thing Coming",
        "🎵 Trust in God (Elevation Worship)",
        "Backup song: Always on Time",
        "",
        "Vocalists",
        "Joyful",
        "🎤 Faye",
        "Solemn",
        "🎤 Fea",
        "🎤 Mina",
        "Back-up",
        "🎤 Anika",
        "",
        "Instrumentalists",
        "🎸LG - Kim",
        "🥁AD - Andoy",
        "",
        "📖 Devotion: Fea, Mina",
        "📖 Soaking: Raymond",
        "Wear: Black and Cream",
      ].join("\n"),
    );
  });

  it("skips empty sections", () => {
    const text = groupChatText({
      date: "2026-11-01",
      language: "tl",
      theme: null,
      palette: null,
      occasion: null,
      songs: [],
      people: [{ role: "joyful", name: "Mina" }],
    });
    expect(text).toBe(
      ["Sunday, November 1 (Tagalog)", "", "Vocalists", "Joyful", "🎤 Mina"].join("\n"),
    );
  });
});
