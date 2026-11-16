"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { endSession, lockLeader, unlockLeader } from "@/lib/session";

export type LeaderState = { error?: string } | undefined;

export async function unlockLeaderTools(_: LeaderState, formData: FormData): Promise<LeaderState> {
  const viewer = await requireViewer();
  const ok = await unlockLeader(viewer.id, String(formData.get("code") ?? ""));
  if (!ok) return { error: "That leader code doesn't match." };
  revalidatePath("/", "layout");
  redirect("/lead");
}

export async function turnOffLeaderTools() {
  const viewer = await requireViewer();
  await lockLeader(viewer.id);
  revalidatePath("/", "layout");
}

export async function signOut() {
  await endSession();
  redirect("/login");
}
