import { todayISO, TEAM_TIME_ZONE } from "../dates";

export function reminderWindow(now: Date, timeZone = TEAM_TIME_ZONE) {
  const date = todayISO(timeZone, now);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(parts.find(p => p.type === "hour")!.value);
  const minute = Number(parts.find(p => p.type === "minute")!.value);
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const tomorrow = new Date(`${date}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return {
    date, tomorrow: tomorrow.toISOString().slice(0, 10),
    sunday: day === 6 && hour >= 18,
    availability: day === 3 && hour >= 18,
    expiresAt: new Date(now.getTime() + ((24 - hour) * 60 - minute) * 60_000 - now.getUTCSeconds() * 1000),
  };
}
