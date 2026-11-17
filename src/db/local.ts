// Local development database (PGlite, embedded Postgres). Never used in production.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import { seedSampleData } from "./seed";

const g = globalThis as unknown as { __sevaLocalDb?: Promise<ReturnType<typeof drizzle<typeof schema>>> };

export function createLocalDb() {
  if (!g.__sevaLocalDb) {
    g.__sevaLocalDb = (async () => {
      const dir = process.env.DATABASE_URL?.replace(/^pglite:\/?\/?/, "") || path.join(process.cwd(), ".data", "pglite");
      fs.mkdirSync(dir, { recursive: true });
      const client = new PGlite(dir);
      const db = drizzle(client, { schema });
      await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
      await seedSampleData(db as never);
      return db;
    })();
    g.__sevaLocalDb.catch(() => (g.__sevaLocalDb = undefined));
  }
  return g.__sevaLocalDb;
}
