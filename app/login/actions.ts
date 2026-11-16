"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { members } from "@/lib/db/schema";
import { clearTeamPass, grantTeamPass, hasTeamPass, startSession } from "@/lib/session";

export type CodeState = { error?: string } | undefined;

export async function enterTeamCode(_: CodeState, formData: FormData): Promise<CodeState> {
  const ok = await grantTeamPass(String(formData.get("code") ?? ""));
  if (!ok) return { error: "That code doesn't match. Check the group chat or ask a leader." };
  redirect("/login");
}

export async function chooseMember(formData: FormData) {
  if (!(await hasTeamPass())) redirect("/login");
  const id = Number(formData.get("memberId"));
  const db = await getDb();
  const [member] = Number.isInteger(id)
    ? await db.select().from(members).where(eq(members.id, id))
    : [];
  if (!member?.active) redirect("/login");
  await startSession(member.id);
  redirect("/");
}

export async function changeTeamCode() {
  await clearTeamPass();
  redirect("/login");
}
