import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getDb } from "./db/client";
import { members } from "./db/schema";
import type { BandSlot } from "./lineup";
import { getSession } from "./session";

export type Viewer = {
  id: number;
  name: string;
  leader: boolean;
  sings: boolean;
  instruments: BandSlot[];
};

/** The signed-in member, or null. Deactivated members are treated as signed out. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await getSession();
  if (!session) return null;
  // Everything after this is per request (the database driver reads the clock).
  await connection();
  const db = await getDb();
  const [member] = await db.select().from(members).where(eq(members.id, session.memberId));
  if (!member || !member.active) return null;
  return {
    id: member.id,
    name: member.name,
    leader: session.leader,
    sings: member.sings,
    instruments: member.instruments,
  };
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

export async function requireLeader() {
  const viewer = await requireViewer();
  if (!viewer.leader) redirect("/me?leader=required");
  return viewer;
}
