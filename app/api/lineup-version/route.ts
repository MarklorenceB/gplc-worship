import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { getLineupRevision } from "@/lib/db/revision";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!(await getViewer())) {
    return Response.json({ error: "Sign in to check for updates." }, { status: 401, headers });
  }
  const revision = await getLineupRevision(await getDb());
  return Response.json({ revision }, { headers });
}
