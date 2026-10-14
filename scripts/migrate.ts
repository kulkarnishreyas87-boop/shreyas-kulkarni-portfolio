// Creates the schema and tables in Neon (safe to run again). Requires DATABASE_URL.
import { databaseUrl, dbSchema, getDb } from "../lib/db/client";

if (!databaseUrl()) {
  console.error("DATABASE_URL is not set. Add it to .env.local first.");
  process.exit(1);
}
await getDb();
console.log(`Schema "${dbSchema()}" is ready.`);
