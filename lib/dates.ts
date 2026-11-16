// Dates are stored as "YYYY-MM-DD" strings and months as "YYYY-MM".
// Formatting always happens in UTC so a stored date never shifts by a day.

export type Language = "tl" | "en";

export const LANGUAGE_LABELS: Record<Language, string> = {
  tl: "Tagalog",
  en: "English",
};

export const TEAM_TIME_ZONE = process.env.APP_TIMEZONE ?? "Asia/Manila";

function utc(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function format(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(utc(date));
}

export function todayISO(timeZone = TEAM_TIME_ZONE, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function monthOf(date: string) {
  return date.slice(0, 7);
}

export function nextMonthId(monthId: string) {
  const [year, month] = monthId.split("-").map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function sundaysInMonth(monthId: string) {
  const first = utc(`${monthId}-01`);
  const day = new Date(first);
  day.setUTCDate(1 + ((7 - first.getUTCDay()) % 7));
  const dates: string[] = [];
  while (day.toISOString().startsWith(monthId)) {
    dates.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 7);
  }
  return dates;
}

export function alternateLanguages(count: number, startWith: Language): Language[] {
  const other: Language = startWith === "tl" ? "en" : "tl";
  return Array.from({ length: count }, (_, i) => (i % 2 === 0 ? startWith : other));
}

export function longDate(date: string) {
  return format(date, { weekday: "long", month: "long", day: "numeric" });
}

export function shortDate(date: string) {
  return format(date, { month: "short", day: "numeric" });
}

export function monthLabel(monthId: string) {
  return format(`${monthId}-01`, { month: "long", year: "numeric" });
}

export function monthName(monthId: string) {
  return format(`${monthId}-01`, { month: "long" });
}

export function dateBlock(date: string) {
  return {
    month: format(date, { month: "short" }),
    day: format(date, { day: "numeric" }),
  };
}

/** The next Sunday on or after the given date. */
export function upcomingSunday(date: string) {
  const day = utc(date);
  day.setUTCDate(day.getUTCDate() + ((7 - day.getUTCDay()) % 7));
  return day.toISOString().slice(0, 10);
}
