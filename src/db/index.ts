import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type DB = ReturnType<typeof drizzle<typeof schema>>;

let dbPromise: Promise<DB> | undefined;

/**
 * Production: Neon over HTTP (works on Cloudflare Workers).
 * Local dev without DATABASE_URL: an embedded PGlite database in ./.data,
 * migrated and seeded automatically. That branch is removed from production
 * builds because NODE_ENV is inlined at build time.
 */
export function getDb(): Promise<DB> {
  if (!dbPromise) {
    const url = process.env.DATABASE_URL;
    if (process.env.NODE_ENV !== "production" && (!url || url.startsWith("pglite"))) {
      dbPromise = import("./local").then((m) => m.createLocalDb() as unknown as Promise<DB>);
      dbPromise.catch(() => (dbPromise = undefined));
    } else {
      if (!url) throw new Error("DATABASE_URL is not set");
      dbPromise = Promise.resolve(drizzle(neon(url), { schema }));
    }
  }
  return dbPromise;
}

export { schema };
