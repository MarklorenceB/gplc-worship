import { mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import * as schema from "./schema";
import { seedIfEmpty } from "./seed";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const migrationsFolder = path.join(process.cwd(), "drizzle");

type Connection = { db: Db; setup: () => Promise<void> };

/**
 * With DATABASE_URL set, connects to that Postgres (production).
 * Without it, uses an embedded PGlite database in .data/pglite so local dev needs no setup.
 */
function connect(): Connection {
  const url = process.env.DATABASE_URL;
  if (url) {
    // prepare: false keeps it compatible with pooled connections (Neon, Supabase, PgBouncer).
    const db = drizzlePostgres({ connection: { url, prepare: false, max: 5 }, schema, casing: "snake_case" });
    return {
      db: db as unknown as Db,
      setup: async () => {
        await migratePostgres(db, { migrationsFolder });
        await seedIfEmpty(db as unknown as Db);
      },
    };
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL is required on Vercel. Connect a shared Postgres database before deploying.");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  mkdirSync(path.dirname(dataDir), { recursive: true });
  const db = drizzlePglite({ connection: { dataDir }, schema, casing: "snake_case" });
  return {
    db: db as unknown as Db,
    setup: async () => {
      await migratePglite(db, { migrationsFolder });
      await seedIfEmpty(db as unknown as Db);
    },
  };
}

// One connection per process, kept across dev hot reloads.
const globalForDb = globalThis as unknown as {
  gplcDb?: Connection;
  gplcReady?: Promise<void>;
};

function connection() {
  globalForDb.gplcDb ??= connect();
  return globalForDb.gplcDb;
}

/** The database, ready to query. Local PGlite is migrated and seeded on first use. */
export async function getDb(): Promise<Db> {
  const conn = connection();
  if (!process.env.DATABASE_URL) {
    globalForDb.gplcReady ??= conn.setup().catch((error) => {
      // Let the next request try again with a fresh connection instead of caching the failure.
      globalForDb.gplcReady = undefined;
      globalForDb.gplcDb = undefined;
      throw error;
    });
    await globalForDb.gplcReady;
  }
  return conn.db;
}

/** Migrate and seed. Used by `npm run db:setup` against a real Postgres. */
export async function setupDb() {
  await connection().setup();
}
