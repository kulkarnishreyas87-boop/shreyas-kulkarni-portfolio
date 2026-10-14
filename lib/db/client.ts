import { neon } from "@neondatabase/serverless";
import { schemaSql } from "./schema";

export type Row = Record<string, any>;
export type Stmt = { text: string; params?: unknown[] };

/** All the app needs from Postgres. Neon's HTTP driver implements it in production, PGlite locally and in tests. */
export interface Db {
  query(text: string, params?: unknown[]): Promise<Row[]>;
  /** Runs the statements in one transaction and returns each statement's rows. */
  tx(stmts: Stmt[]): Promise<Row[][]>;
}

/**
 * Postgres schema the app reads and writes. Production uses "portfolio"; everything else defaults to
 * "portfolio_dev", so nothing run on a laptop touches live data unless DB_SCHEMA is set on purpose.
 */
export function dbSchema(): string {
  const s = (process.env.DB_SCHEMA || (process.env.NODE_ENV === "production" ? "portfolio" : "portfolio_dev")).trim();
  if (!/^[a-z_][a-z0-9_]{0,40}$/.test(s)) throw new Error(`Invalid DB_SCHEMA "${s}"`);
  return s;
}

export type Table =
  | "projects"
  | "technologies"
  | "project_technologies"
  | "highlights"
  | "media"
  | "repo_snapshots"
  | "drafts"
  | "contact_messages"
  | "sync_runs"
  | "rate_limits";

/** Schema-qualified table name for building queries. */
export const t = (name: Table) => `"${dbSchema()}".${name}`;

export const databaseUrl = () => (process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim();
export const usingNeon = () => databaseUrl() !== "";

function neonDb(url: string): Db {
  const sql = neon(url);
  return {
    query: async (text, params = []) => (await sql.query(text, params as any[])) as Row[],
    tx: async (stmts) => (await sql.transaction(stmts.map((s) => sql.query(s.text, (s.params ?? []) as any[])))) as Row[][],
  };
}

/** In-memory PGlite, used when DATABASE_URL is empty (local dev without Neon) and by the tests. */
export async function pgliteDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite();
  return {
    query: async (text, params = []) => (await pg.query(text, params as any[])).rows as Row[],
    tx: async (stmts) =>
      pg.transaction(async (tr) => {
        const out: Row[][] = [];
        for (const s of stmts) out.push((await tr.query(s.text, (s.params ?? []) as any[])).rows as Row[]);
        return out;
      }),
  };
}

// Kept on globalThis so Next's dev reloads reuse one database instead of re-creating (and re-seeding) it.
const g = globalThis as unknown as { __portfolioDb?: Promise<Db>; __portfolioDbOverride?: Db };

/** Tests inject their own database; pass undefined to restore normal behaviour. */
export function setDb(d: Db | undefined) {
  g.__portfolioDbOverride = d;
}

/** The database with the schema created. Local PGlite is seeded with the six projects on first use. */
export function getDb(): Promise<Db> {
  if (g.__portfolioDbOverride) return Promise.resolve(g.__portfolioDbOverride);
  if (!g.__portfolioDb) {
    g.__portfolioDb = (async () => {
      const url = databaseUrl();
      const d = url ? neonDb(url) : await pgliteDb();
      await migrate(d);
      if (!url) {
        const { seed } = await import("./seed");
        await seed(d);
      }
      return d;
    })();
    g.__portfolioDb.catch(() => (g.__portfolioDb = undefined)); // a failed attempt (network blip) is retried next time
  }
  return g.__portfolioDb;
}

/** Creates the schema and tables if missing. Every statement is idempotent. */
export async function migrate(d: Db, schema = dbSchema()) {
  for (const stmt of schemaSql(schema)) await d.query(stmt);
}
