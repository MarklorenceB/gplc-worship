"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireLeader } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { deleteMonthLineups, deleteSundayLineup, LineupChangedError, validLineupDate, validLineupMonth } from "@/lib/db/delete-lineups";

export type DeleteLineupState = { error: string } | undefined;

export async function deleteLineups(_: DeleteLineupState, form: FormData): Promise<DeleteLineupState> {
  await requireLeader();
  const scope = form.get("scope");
  const target = String(form.get("target") ?? "");
  if ((scope !== "sunday" && scope !== "month") ||
      !(scope === "sunday" ? validLineupDate(target) : validLineupMonth(target))) {
    return { error: "Choose a valid lineup to delete." };
  }
  if (form.get("confirmed") !== target) return { error: "Confirm the date or month before deleting." };

  try {
    const db = await getDb();
    if (scope === "sunday") {
      const serviceId = Number(form.get("serviceId"));
      if (!Number.isSafeInteger(serviceId) || serviceId < 1) return { error: "Reload the lineup and try again." };
      if (!(await deleteSundayLineup(db, serviceId, target))) {
        return { error: "This lineup was already removed or replaced. Return to Leader tools to check." };
      }
    } else {
      const expected: unknown = JSON.parse(String(form.get("serviceIds") ?? ""));
      if (!Array.isArray(expected) || expected.length > 5 || expected.some(id => !Number.isSafeInteger(id) || id < 1)) {
        return { error: "Reload this month and try again." };
      }
      if (!(await deleteMonthLineups(db, target, expected))) {
        return { error: "This month was already removed. Return to Leader tools to check." };
      }
    }
  } catch (error) {
    return { error: error instanceof LineupChangedError ? error.message : "Couldn't delete the lineup. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect(`/lead?year=${target.slice(0, 4)}&deleted=${target}`);
}
