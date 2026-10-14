import { migrate, pgliteDb, setDb, type Db } from "../lib/db/client";
import { seed } from "../lib/db/seed";

/** A fresh in-memory Postgres with the schema (and optionally the six seed projects), wired in as the app's database. */
export async function freshDb(opts: { seeded?: boolean } = {}): Promise<Db> {
  const d = await pgliteDb();
  await migrate(d);
  if (opts.seeded) await seed(d);
  setDb(d);
  return d;
}
