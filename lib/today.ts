import "server-only";
import { connection } from "next/server";
import { todayISO } from "./dates";

/** Today's date for the team. Marks the render as request-time so the date is never stale. */
export async function getToday() {
  await connection();
  return todayISO();
}
