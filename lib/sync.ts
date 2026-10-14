import { getDb, t, type Db, type Stmt } from "./db/client";
import { stackStmts } from "./db/seed";
import { GitHub, githubUser, type RepoFacts } from "./github";
import { draftFromReadme, geminiModel, hasGemini, type DraftWriter } from "./ai/draft";
import type { DraftPayload } from "./repo";

export type SyncResult = {
  runId: number;
  reposSeen: number;
  reposChanged: number;
  draftsCreated: number;
  created: string[];
  errors: string[];
};

export type SyncOptions = {
  trigger?: "cron" | "manual" | "cli";
  github?: GitHub;
  owner?: string;
  /** Gemini writer; null turns drafting off. Defaults to Gemini when GEMINI_API_KEY is set. */
  writer?: DraftWriter | null;
  /** At most this many Gemini drafts per run, so a run stays well inside Vercel's function time limit. */
  maxDrafts?: number;
};

export const slugify = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "project";

export const titleFromRepo = (name: string) =>
  name
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

/**
 * GitHub → Neon. For each public repo: create a hidden project if it is new, refresh repo facts, update the
 * stack and live URL unless edited by hand, attach docs/component-map.png, and ask Gemini for a draft only
 * when the README changed. One failing repo is recorded and the rest carry on.
 */
export async function runSync(opts: SyncOptions = {}): Promise<SyncResult> {
  const d = await getDb();
  const gh = opts.github ?? new GitHub();
  const owner = opts.owner ?? githubUser();
  const writer = opts.writer !== undefined ? opts.writer : hasGemini() ? undefined : null;
  const maxDrafts = opts.maxDrafts ?? 3;

  const [run] = await d.query(`INSERT INTO ${t("sync_runs")} (trigger) VALUES ($1) RETURNING id`, [opts.trigger ?? "cron"]);
  const result: SyncResult = { runId: run.id, reposSeen: 0, reposChanged: 0, draftsCreated: 0, created: [], errors: [] };

  try {
    const repos = await gh.listRepos(owner);
    result.reposSeen = repos.length;
    const examples = await styleExamples(d);
    for (const repo of repos) {
      try {
        const facts = await gh.facts(owner, repo);
        const out = await syncRepo(d, facts, {
          writer: result.draftsCreated < maxDrafts ? writer : null,
          examples,
        });
        if (out.created) result.created.push(repo.name);
        if (out.changed) result.reposChanged++;
        if (out.drafted) result.draftsCreated++;
        if (out.draftError) result.errors.push(`${repo.name}: draft failed: ${out.draftError}`);
      } catch (e) {
        result.errors.push(`${repo.name}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    result.errors.push((e as Error).message);
  }

  await d.query(
    `UPDATE ${t("sync_runs")} SET finished_at = now(), repos_seen = $2, repos_changed = $3, drafts_created = $4, error = $5 WHERE id = $1`,
    [run.id, result.reposSeen, result.reposChanged, result.draftsCreated, result.errors.join("\n").slice(0, 4000) || null],
  );
  return result;
}

/** The first two published write-ups, given to Gemini as tone and length examples. */
async function styleExamples(d: Db): Promise<DraftPayload[]> {
  const rows = await d.query(
    `SELECT p.title, p.tagline, p.kind, p.problem, p.approach, p.role,
       COALESCE((SELECT json_agg(json_build_object('kind', h.kind, 'text', h.text) ORDER BY h.sort)
                 FROM ${t("highlights")} h WHERE h.project_id = p.id), '[]') AS highlights,
       COALESCE((SELECT json_agg(te.name ORDER BY pt.sort) FROM ${t("project_technologies")} pt
                 JOIN ${t("technologies")} te ON te.id = pt.technology_id WHERE pt.project_id = p.id), '[]') AS stack
     FROM ${t("projects")} p WHERE p.status = 'published' AND p.approach <> ''
     ORDER BY p.featured DESC, p.sort_order LIMIT 2`,
  );
  return rows.map((r) => ({
    ...(r as any),
    highlights: typeof r.highlights === "string" ? JSON.parse(r.highlights) : r.highlights,
    stack: typeof r.stack === "string" ? JSON.parse(r.stack) : r.stack,
  }));
}

async function uniqueSlug(d: Db, base: string): Promise<string> {
  for (let i = 0; ; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    const [r] = await d.query(`SELECT 1 FROM ${t("projects")} WHERE slug = $1`, [slug]);
    if (!r) return slug;
  }
}

export async function syncRepo(
  d: Db,
  f: RepoFacts,
  ctx: { writer?: DraftWriter | null; examples: DraftPayload[] },
): Promise<{ created: boolean; changed: boolean; drafted: boolean; draftError?: string }> {
  let [p] = await d.query(
    `SELECT p.id, p.approach, p.edited_fields, s.readme_sha, s.drafted_sha
     FROM ${t("projects")} p LEFT JOIN ${t("repo_snapshots")} s ON s.project_id = p.id WHERE p.repo_name = $1`,
    [f.name],
  );
  let created = false;
  if (!p) {
    // New repos start hidden: nothing reaches the public site until it is reviewed and published in /admin.
    const slug = await uniqueSlug(d, slugify(f.name));
    [p] = await d.query(
      `INSERT INTO ${t("projects")} (slug, repo_name, title, tagline, status, sort_order)
       VALUES ($1,$2,$3,$4,'hidden',100) RETURNING id, approach, edited_fields, NULL::text AS readme_sha, NULL::text AS drafted_sha`,
      [slug, f.name, titleFromRepo(f.name), f.description],
    );
    created = true;
  }
  const edited = new Set<string>(p.edited_fields ?? []);
  const prevSha: string | null = p.readme_sha;
  const newSha = f.readme?.sha ?? null;
  const changed = created || (prevSha !== null && newSha !== prevSha);

  const stmts: Stmt[] = [
    {
      text: `INSERT INTO ${t("repo_snapshots")}
               (project_id, stars, forks, primary_language, languages, description, homepage, default_branch, last_commit_at, readme_sha, fetched_at)
             VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10, now())
             ON CONFLICT (project_id) DO UPDATE SET stars = EXCLUDED.stars, forks = EXCLUDED.forks,
               primary_language = EXCLUDED.primary_language, languages = EXCLUDED.languages, description = EXCLUDED.description,
               homepage = EXCLUDED.homepage, default_branch = EXCLUDED.default_branch, last_commit_at = EXCLUDED.last_commit_at,
               readme_sha = EXCLUDED.readme_sha, fetched_at = now()`,
      params: [p.id, f.stars, f.forks, f.primary_language, JSON.stringify(f.languages), f.description, f.homepage,
               f.default_branch, f.pushed_at, newSha],
    },
    { text: `UPDATE ${t("projects")} SET repo_url = $2 WHERE id = $1`, params: [p.id, f.html_url] },
  ];
  if (!edited.has("live_url") && f.homepage) {
    stmts.push({ text: `UPDATE ${t("projects")} SET live_url = $2 WHERE id = $1`, params: [p.id, f.homepage] });
  }
  if (!edited.has("stack") && f.stack.length) stmts.push(...stackStmts(p.id, f.stack));
  if (f.componentMap) {
    stmts.push({
      text: `INSERT INTO ${t("media")} (project_id, kind, url, alt, sort, source) VALUES ($1,'component_map',$2,$3,50,'sync')
             ON CONFLICT (project_id, url) DO NOTHING`,
      params: [p.id, f.componentMap, `${titleFromRepo(f.name)} components map`],
    });
  }
  await d.tx(stmts);

  // Draft only for a README Gemini has not seen. On the very first sync of a project that already has a
  // write-up, the current README becomes the baseline instead, so seeded projects do not all get redrafted.
  let drafted = false;
  if (f.readme && newSha !== p.drafted_sha) {
    const firstSightWithContent = prevSha === null && !created && (p.approach ?? "") !== "";
    if (firstSightWithContent) {
      await d.query(`UPDATE ${t("repo_snapshots")} SET drafted_sha = $2 WHERE project_id = $1`, [p.id, newSha]);
    } else if (ctx.writer !== null) {
      let payload: DraftPayload;
      try {
        payload = await draftFromReadme(
          { repo: f.name, description: f.description, homepage: f.homepage, detectedStack: f.stack, readme: f.readme.text, examples: ctx.examples },
          ctx.writer,
        );
      } catch (e) {
        // The repo facts are already saved; only the draft is missing, and the next run tries again.
        return { created, changed, drafted: false, draftError: (e as Error).message };
      }
      await d.tx([
        {
          text: `INSERT INTO ${t("drafts")} (project_id, source_readme_sha, payload, model) VALUES ($1,$2,$3::jsonb,$4)
                 ON CONFLICT (project_id, source_readme_sha) DO NOTHING`,
          params: [p.id, newSha, JSON.stringify(payload), ctx.writer ? "injected" : geminiModel()],
        },
        // Older pending drafts for this project are superseded by the new README.
        {
          text: `UPDATE ${t("drafts")} SET status = 'rejected', reviewed_at = now()
                 WHERE project_id = $1 AND status = 'pending' AND source_readme_sha <> $2`,
          params: [p.id, newSha],
        },
        { text: `UPDATE ${t("repo_snapshots")} SET drafted_sha = $2 WHERE project_id = $1`, params: [p.id, newSha] },
      ]);
      drafted = true;
    }
  }
  return { created, changed, drafted };
}
