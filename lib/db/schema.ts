/**
 * The Neon tables from the components map, plus rate_limits (contact form and admin login counters, shared
 * across serverless instances). Every statement is idempotent, so running them on each cold start is safe.
 */
export function schemaSql(schema: string): string[] {
  const q = (n: string) => `"${schema}".${n}`;
  return [
    `CREATE SCHEMA IF NOT EXISTS "${schema}"`,
    `CREATE TABLE IF NOT EXISTS ${q("projects")} (
       id            serial PRIMARY KEY,
       slug          text NOT NULL UNIQUE,
       repo_name     text UNIQUE,
       title         text NOT NULL,
       tagline       text NOT NULL DEFAULT '',
       kind          text NOT NULL DEFAULT '',
       problem       text NOT NULL DEFAULT '',
       approach      text NOT NULL DEFAULT '',
       role          text NOT NULL DEFAULT '',
       next_steps    text NOT NULL DEFAULT '',
       live_url      text,
       live_note     text NOT NULL DEFAULT '',
       repo_url      text,
       featured      boolean NOT NULL DEFAULT false,
       sort_order    integer NOT NULL DEFAULT 100,
       status        text NOT NULL DEFAULT 'hidden' CHECK (status IN ('draft','published','hidden')),
       edited_fields text[] NOT NULL DEFAULT '{}',
       created_at    timestamptz NOT NULL DEFAULT now(),
       updated_at    timestamptz NOT NULL DEFAULT now()
     )`,
    `CREATE TABLE IF NOT EXISTS ${q("technologies")} (
       id       serial PRIMARY KEY,
       name     text NOT NULL UNIQUE,
       category text NOT NULL DEFAULT 'other'
     )`,
    `CREATE TABLE IF NOT EXISTS ${q("project_technologies")} (
       project_id    integer NOT NULL REFERENCES ${q("projects")}(id) ON DELETE CASCADE,
       technology_id integer NOT NULL REFERENCES ${q("technologies")}(id) ON DELETE CASCADE,
       sort          integer NOT NULL DEFAULT 0,
       PRIMARY KEY (project_id, technology_id)
     )`,
    `CREATE TABLE IF NOT EXISTS ${q("highlights")} (
       id         serial PRIMARY KEY,
       project_id integer NOT NULL REFERENCES ${q("projects")}(id) ON DELETE CASCADE,
       kind       text NOT NULL DEFAULT 'feature' CHECK (kind IN ('feature','decision','metric')),
       text       text NOT NULL,
       sort       integer NOT NULL DEFAULT 0
     )`,
    `CREATE INDEX IF NOT EXISTS highlights_project_idx ON ${q("highlights")} (project_id, sort)`,
    `CREATE TABLE IF NOT EXISTS ${q("media")} (
       id         serial PRIMARY KEY,
       project_id integer NOT NULL REFERENCES ${q("projects")}(id) ON DELETE CASCADE,
       kind       text NOT NULL CHECK (kind IN ('screenshot','component_map','video')),
       url        text NOT NULL,
       alt        text NOT NULL DEFAULT '',
       sort       integer NOT NULL DEFAULT 0,
       source     text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','sync')),
       UNIQUE (project_id, url)
     )`,
    `CREATE TABLE IF NOT EXISTS ${q("repo_snapshots")} (
       project_id       integer PRIMARY KEY REFERENCES ${q("projects")}(id) ON DELETE CASCADE,
       stars            integer NOT NULL DEFAULT 0,
       forks            integer NOT NULL DEFAULT 0,
       primary_language text,
       languages        jsonb NOT NULL DEFAULT '{}'::jsonb,
       description      text NOT NULL DEFAULT '',
       homepage         text,
       default_branch   text NOT NULL DEFAULT 'main',
       last_commit_at   timestamptz,
       readme_sha       text,
       drafted_sha      text,
       fetched_at       timestamptz NOT NULL DEFAULT now()
     )`,
    `CREATE TABLE IF NOT EXISTS ${q("drafts")} (
       id                serial PRIMARY KEY,
       project_id        integer NOT NULL REFERENCES ${q("projects")}(id) ON DELETE CASCADE,
       source_readme_sha text NOT NULL,
       payload           jsonb NOT NULL,
       model             text NOT NULL DEFAULT '',
       status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
       created_at        timestamptz NOT NULL DEFAULT now(),
       reviewed_at       timestamptz,
       UNIQUE (project_id, source_readme_sha)
     )`,
    `CREATE TABLE IF NOT EXISTS ${q("contact_messages")} (
       id          serial PRIMARY KEY,
       name        text NOT NULL,
       email       text NOT NULL,
       message     text NOT NULL,
       ip_hash     text NOT NULL,
       emailed_at  timestamptz,
       email_error text,
       created_at  timestamptz NOT NULL DEFAULT now()
     )`,
    `CREATE TABLE IF NOT EXISTS ${q("sync_runs")} (
       id             serial PRIMARY KEY,
       trigger        text NOT NULL DEFAULT 'cron',
       started_at     timestamptz NOT NULL DEFAULT now(),
       finished_at    timestamptz,
       repos_seen     integer NOT NULL DEFAULT 0,
       repos_changed  integer NOT NULL DEFAULT 0,
       drafts_created integer NOT NULL DEFAULT 0,
       error          text
     )`,
    `CREATE TABLE IF NOT EXISTS ${q("rate_limits")} (
       key          text NOT NULL,
       window_start timestamptz NOT NULL,
       count        integer NOT NULL DEFAULT 0,
       PRIMARY KEY (key, window_start)
     )`,
  ];
}
