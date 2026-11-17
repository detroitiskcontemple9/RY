// Applies SQL migrations in ./drizzle to the Neon database in DATABASE_URL.
// Usage: DATABASE_URL=postgres://... npm run db:migrate
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL;
if (!url || !url.startsWith("postgres")) {
  console.error("Set DATABASE_URL to your Neon connection string.");
  process.exit(1);
}
await migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" });
console.log("Migrations applied.");
