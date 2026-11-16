import type { Db } from "./client";
import { assignments, members, months, serviceSongs, services } from "./schema";
import { SEED_MEMBERS, SEED_MONTHS, SEED_SERVICES } from "./seed-data";
import { BAND_SLOTS, type Role } from "../lineup";

/** Loads the doc's roster and Sundays into an empty database. Returns true if it seeded. */
export async function seedIfEmpty(db: Db) {
  const existing = await db.select({ id: members.id }).from(members).limit(1);
  if (existing.length) return false;

  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(members)
      .values(
        SEED_MEMBERS.map((m) => ({
          name: m.name,
          sings: m.sings ?? false,
          instruments: m.instruments ?? [],
        })),
      )
      .returning({ id: members.id, name: members.name });
    const idOf = new Map(inserted.map((m) => [m.name, m.id]));
    const memberId = (name: string) => {
      const id = idOf.get(name);
      if (!id) throw new Error(`Seed data names an unknown member: ${name}`);
      return id;
    };

    await tx.insert(months).values(
      SEED_MONTHS.map((m) => ({
        id: m.id,
        theme: m.theme ?? null,
        note: m.note ?? null,
        availabilityOpen: m.availabilityOpen ?? false,
      })),
    );

    for (const s of SEED_SERVICES) {
      const [service] = await tx
        .insert(services)
        .values({
          date: s.date,
          monthId: s.date.slice(0, 7),
          language: s.language,
          palette: s.palette ?? null,
          status: s.status,
        })
        .returning({ id: services.id });

      if (s.songs?.length) {
        await tx.insert(serviceSongs).values(
          s.songs.map((title, position) => ({ serviceId: service.id, position, title })),
        );
      }

      const people: { role: Role; name: string }[] = [
        ...(s.joyful ?? []).map((name) => ({ role: "joyful" as const, name })),
        ...(s.solemn ?? []).map((name) => ({ role: "solemn" as const, name })),
        ...(s.backup ?? []).map((name) => ({ role: "backup" as const, name })),
        ...BAND_SLOTS.flatMap((slot) => (s.band?.[slot] ? [{ role: slot, name: s.band[slot]! }] : [])),
        ...(s.devotion ?? []).map((name) => ({ role: "devotion" as const, name })),
        ...(s.soaking ?? []).map((name) => ({ role: "soaking" as const, name })),
      ];
      if (people.length) {
        await tx.insert(assignments).values(
          people.map((p, position) => ({
            serviceId: service.id,
            memberId: memberId(p.name),
            role: p.role,
            position,
          })),
        );
      }
    }
  });
  return true;
}
