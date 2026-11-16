import { LANGUAGE_LABELS, longDate, type Language } from "./dates";

export const VOCAL_ROLES = ["joyful", "solemn", "backup"] as const;
export const BAND_SLOTS = ["LG", "KB", "BG", "AG", "AD", "ST"] as const;
export const CARE_ROLES = ["devotion", "soaking"] as const;

export type VocalRole = (typeof VOCAL_ROLES)[number];
export type BandSlot = (typeof BAND_SLOTS)[number];
export type CareRole = (typeof CARE_ROLES)[number];
export type Role = VocalRole | BandSlot | CareRole;
export type Answer = "yes" | "maybe" | "no";
export type SongSet = "joyful" | "solemn";

export const ROLES: readonly Role[] = [...VOCAL_ROLES, ...BAND_SLOTS, ...CARE_ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  joyful: "Joyful",
  solemn: "Solemn",
  backup: "Back-up",
  LG: "Lead guitar",
  KB: "Keyboard",
  BG: "Bass",
  AG: "Acoustic guitar",
  AD: "Drums",
  ST: "Sound tech",
  devotion: "Devotion",
  soaking: "Soaking",
};

// What a member sees about themselves, e.g. "Joyful leader" rather than "Joyful".
export const MY_ROLE_LABELS: Record<Role, string> = {
  ...ROLE_LABELS,
  joyful: "Joyful leader",
  solemn: "Solemn leader",
  backup: "Back-up vocals",
};

const BAND_EMOJI: Record<BandSlot, string> = {
  LG: "🎸",
  KB: "🎹",
  BG: "🎻",
  AG: "🪕",
  AD: "🥁",
  ST: "📟",
};

export const ANSWER_LABELS: Record<Answer, string> = {
  yes: "Can serve",
  maybe: "Not sure",
  no: "Can't",
};

export function isBandSlot(role: string): role is BandSlot {
  return (BAND_SLOTS as readonly string[]).includes(role);
}

export function isRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}

export function ordinal(n: number) {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** Number of distinct Sundays each member serves in the given assignments. */
export function serveCounts(assignments: { serviceId: number; memberId: number }[]) {
  const services = new Map<number, Set<number>>();
  for (const { serviceId, memberId } of assignments) {
    if (!services.has(memberId)) services.set(memberId, new Set());
    services.get(memberId)!.add(serviceId);
  }
  return new Map([...services].map(([memberId, set]) => [memberId, set.size]));
}

export const HEAVY_MONTH = 3;

export type Issue = {
  kind: "conflict" | "unavailable" | "unsure" | "heavy";
  level: "error" | "warn";
  memberId: number;
  message: string;
};

export function checkLineup(input: {
  assignments: { memberId: number; role: Role }[];
  /** This Sunday's availability answers by member. */
  answers: Map<number, Answer>;
  /** Sundays each member serves this month, including this one. */
  monthCounts: Map<number, number>;
  names: Map<number, string>;
}): Issue[] {
  const { assignments, answers, monthCounts, names } = input;
  const name = (id: number) => names.get(id) ?? "Someone";
  const members = [...new Set(assignments.map((a) => a.memberId))];
  const issues: Issue[] = [];

  for (const memberId of members) {
    const slots = assignments
      .filter((a) => a.memberId === memberId && isBandSlot(a.role))
      .map((a) => ROLE_LABELS[a.role].toLowerCase());
    if (slots.length > 1) {
      issues.push({
        kind: "conflict",
        level: "error",
        memberId,
        message: `${name(memberId)} is on ${slots.join(" and ")}`,
      });
    }
  }

  for (const memberId of members) {
    const answer = answers.get(memberId);
    if (answer === "no") {
      issues.push({
        kind: "unavailable",
        level: "error",
        memberId,
        message: `${name(memberId)} said they can't serve this Sunday`,
      });
    } else if (answer === "maybe") {
      issues.push({
        kind: "unsure",
        level: "warn",
        memberId,
        message: `${name(memberId)} isn't sure they can serve`,
      });
    }
  }

  for (const memberId of members) {
    const count = monthCounts.get(memberId) ?? 0;
    if (count >= HEAVY_MONTH) {
      issues.push({
        kind: "heavy",
        level: "warn",
        memberId,
        message: `${name(memberId)} would serve ${count} Sundays this month`,
      });
    }
  }

  return issues;
}

export function lineupChecklist(input: { songCount: number; roles: Role[] }) {
  const has = (role: Role) => input.roles.includes(role);
  return [
    { label: "Songs", done: input.songCount > 0 },
    { label: "Joyful leader", done: has("joyful") },
    { label: "Solemn leader", done: has("solemn") },
    { label: "Devotion", done: has("devotion") },
  ];
}

export type LineupSong = {
  title: string;
  artist: string | null;
  set: SongSet | null;
  isBackup: boolean;
};

/** The lineup as plain text, in the same emoji format the team uses in the doc and group chat. */
export function groupChatText(lineup: {
  date: string;
  language: Language;
  theme: string | null;
  palette: string | null;
  occasion: string | null;
  songs: LineupSong[];
  people: { role: Role; name: string }[];
}) {
  const sections: string[][] = [];
  const header = [`${longDate(lineup.date)} (${LANGUAGE_LABELS[lineup.language]})`];
  if (lineup.occasion) header.push(lineup.occasion);
  if (lineup.theme) header.push(`Theme: ${lineup.theme}`);
  sections.push(header);

  const songLine = (s: LineupSong) => (s.artist ? `${s.title} (${s.artist})` : s.title);
  const songs = lineup.songs.filter((s) => !s.isBackup).map((s) => `🎵 ${songLine(s)}`);
  const backups = lineup.songs.filter((s) => s.isBackup).map((s) => `Backup song: ${songLine(s)}`);
  if (songs.length || backups.length) sections.push(["Songs", ...songs, ...backups]);

  const namesFor = (role: Role) => lineup.people.filter((p) => p.role === role).map((p) => p.name);

  const vocals = VOCAL_ROLES.flatMap((role) => {
    const people = namesFor(role);
    return people.length ? [ROLE_LABELS[role], ...people.map((n) => `🎤 ${n}`)] : [];
  });
  if (vocals.length) sections.push(["Vocalists", ...vocals]);

  const band = BAND_SLOTS.flatMap((slot) =>
    namesFor(slot).map((n) => `${BAND_EMOJI[slot]}${slot} - ${n}`),
  );
  if (band.length) sections.push(["Instrumentalists", ...band]);

  const care: string[] = [];
  const devotion = namesFor("devotion");
  const soaking = namesFor("soaking");
  if (devotion.length) care.push(`📖 Devotion: ${devotion.join(", ")}`);
  if (soaking.length) care.push(`📖 Soaking: ${soaking.join(", ")}`);
  if (lineup.palette) care.push(`Wear: ${lineup.palette}`);
  if (care.length) sections.push(care);

  return sections.map((lines) => lines.join("\n")).join("\n\n");
}
