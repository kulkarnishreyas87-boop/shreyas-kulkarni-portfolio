// Loads the six starting projects into Neon. Existing projects (same slug) are never touched.
import { databaseUrl, dbSchema, getDb } from "../lib/db/client";
import { seed } from "../lib/db/seed";

if (!databaseUrl()) {
  console.error("DATABASE_URL is not set. Without it the dev server seeds an in-memory database by itself.");
  process.exit(1);
}
const d = await getDb();
const { inserted } = await seed(d);
console.log(inserted.length ? `Inserted into "${dbSchema()}": ${inserted.join(", ")}` : `Nothing to insert; all projects already exist in "${dbSchema()}".`);
