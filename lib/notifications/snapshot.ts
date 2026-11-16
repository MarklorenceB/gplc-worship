import { sql } from "drizzle-orm";

// Excludes updated_at and row IDs so saving unchanged data stays quiet.
// Keep the initial-state SQL in migration 0001 in sync with this expression.
export const lineupFingerprint = sql<string>`md5(jsonb_build_object(
  'details', jsonb_build_array(services.date, services.language, services.palette, services.occasion, services.notes, services.status,
    (select theme from months where id = services.month_id), (select note from months where id = services.month_id)),
  'songs', (select jsonb_agg(jsonb_build_array(title, artist, "set", is_backup) order by position, id) from service_songs where service_id = services.id),
  'people', (select jsonb_agg(jsonb_build_array(member_id, role) order by role, position, id) from assignments where service_id = services.id)
)::text)`;
