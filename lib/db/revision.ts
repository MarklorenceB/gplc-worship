import { sql } from "drizzle-orm";
import type { Db } from "./client";

/** One database snapshot, shared by every server instance. No process-local counters. */
export async function getLineupRevision(db: Db): Promise<string> {
  const [row] = await db.select({
    revision: sql<string>`md5(jsonb_build_object(
      'months', (select jsonb_agg(to_jsonb(m) order by m.id) from months m),
      'services', (select jsonb_agg(to_jsonb(s) order by s.id) from services s),
      'songs', (select jsonb_agg(to_jsonb(s) order by s.id) from service_songs s),
      'assignments', (select jsonb_agg(to_jsonb(a) order by a.id) from assignments a),
      'members', (select jsonb_agg(to_jsonb(m) order by m.id) from members m),
      'availability', (select jsonb_agg(to_jsonb(a) order by a.member_id, a.service_id) from availability a),
      'notes', (select jsonb_agg(to_jsonb(n) order by n.member_id, n.month_id) from availability_notes n),
      'announcements', (select jsonb_agg(to_jsonb(a) order by a.id) from announcements a)
    )::text)`,
  }).from(sql`(values (1)) as snapshot(value)`);
  return row.revision;
}
