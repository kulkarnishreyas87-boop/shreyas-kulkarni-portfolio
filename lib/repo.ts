import { getDb, t, type Row, type Stmt } from "./db/client";
import { stackStmts } from "./db/seed";

export type Status = "draft" | "published" | "hidden";
export type HighlightKind = "feature" | "decision" | "metric";
export type MediaKind = "screenshot" | "component_map" | "video";

export type ProjectSummary = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  kind: string;
  live_url: string | null;
  live_note: string;
  repo_url: string | null;
  featured: boolean;
  sort_order: number;
  status: Status;
  stack: string[];
  cover: { url: string; alt: string; kind: MediaKind } | null;
  stars: number;
  last_commit_at: string | null;
};

export type Highlight = { id: number; kind: HighlightKind; text: string; sort: number };
export type Media = { id: number; kind: MediaKind; url: string; alt: string; sort: number; source: "manual" | "sync" };

export type Project = ProjectSummary & {
  repo_name: string | null;
  problem: string;
  approach: string;
  role: string;
  next_steps: string;
  edited_fields: string[];
  highlights: Highlight[];
  media: Media[];
  languages: Record<string, number>;
  updated_at: string;
};

const iso = (v: unknown) => (v == null ? null : new Date(v as string).toISOString());

// One query for the list: stack tags in order, a cover image (screenshot first, then the component map) and repo facts.
const SUMMARY_SELECT = () => `
  SELECT p.*,
    COALESCE((SELECT array_agg(te.name ORDER BY pt.sort, te.name)
              FROM ${t("project_technologies")} pt JOIN ${t("technologies")} te ON te.id = pt.technology_id
              WHERE pt.project_id = p.id), '{}') AS stack,
    (SELECT json_build_object('url', m.url, 'alt', m.alt, 'kind', m.kind) FROM ${t("media")} m
       WHERE m.project_id = p.id AND m.kind IN ('screenshot','component_map')
       ORDER BY (m.kind = 'screenshot') DESC, m.sort, m.id LIMIT 1) AS cover,
    COALESCE(s.stars, 0) AS stars, s.last_commit_at, COALESCE(s.languages, '{}'::jsonb) AS languages
  FROM ${t("projects")} p LEFT JOIN ${t("repo_snapshots")} s ON s.project_id = p.id`;

function toSummary(r: Row): ProjectSummary {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    tagline: r.tagline,
    kind: r.kind,
    live_url: r.live_url,
    live_note: r.live_note,
    repo_url: r.repo_url,
    featured: r.featured,
    sort_order: r.sort_order,
    status: r.status,
    stack: r.stack ?? [],
    cover: typeof r.cover === "string" ? JSON.parse(r.cover) : r.cover ?? null,
    stars: Number(r.stars ?? 0),
    last_commit_at: iso(r.last_commit_at),
  };
}

/** Published projects in display order. Admin passes all=true to include drafts and hidden ones. */
export async function listProjects(opts: { all?: boolean } = {}): Promise<ProjectSummary[]> {
  const d = await getDb();
  const rows = await d.query(
    `${SUMMARY_SELECT()} ${opts.all ? "" : "WHERE p.status = 'published'"} ORDER BY p.featured DESC, p.sort_order, p.title`,
  );
  return rows.map(toSummary);
}

export async function getProject(slug: string, opts: { includeUnpublished?: boolean } = {}): Promise<Project | null> {
  const d = await getDb();
  const [r] = await d.query(
    `${SUMMARY_SELECT()} WHERE p.slug = $1 ${opts.includeUnpublished ? "" : "AND p.status = 'published'"}`,
    [slug],
  );
  if (!r) return null;
  const [highlights, media] = await Promise.all([
    d.query(`SELECT id, kind, text, sort FROM ${t("highlights")} WHERE project_id = $1 ORDER BY sort, id`, [r.id]),
    d.query(`SELECT id, kind, url, alt, sort, source FROM ${t("media")} WHERE project_id = $1 ORDER BY sort, id`, [r.id]),
  ]);
  return {
    ...toSummary(r),
    repo_name: r.repo_name,
    problem: r.problem,
    approach: r.approach,
    role: r.role,
    next_steps: r.next_steps,
    edited_fields: r.edited_fields ?? [],
    highlights: highlights as Highlight[],
    media: media as Media[],
    languages: typeof r.languages === "string" ? JSON.parse(r.languages) : r.languages ?? {},
    updated_at: iso(r.updated_at)!,
  };
}

export async function getProjectById(id: number): Promise<Project | null> {
  const d = await getDb();
  const [r] = await d.query(`SELECT slug FROM ${t("projects")} WHERE id = $1`, [id]);
  return r ? getProject(r.slug, { includeUnpublished: true }) : null;
}

export type TechCount = { name: string; category: string; count: number };

/** Technologies used by published projects, most used first. */
export async function listTechnologies(): Promise<TechCount[]> {
  const d = await getDb();
  const rows = await d.query(
    `SELECT te.name, te.category, count(*)::int AS count
     FROM ${t("technologies")} te
     JOIN ${t("project_technologies")} pt ON pt.technology_id = te.id
     JOIN ${t("projects")} p ON p.id = pt.project_id AND p.status = 'published'
     GROUP BY te.name, te.category ORDER BY count DESC, te.name`,
  );
  return rows as TechCount[];
}

// ---------- Admin edits ----------

export const EDITABLE_TEXT = ["title", "tagline", "kind", "problem", "approach", "role", "next_steps", "live_url", "live_note"] as const;
export type EditableText = (typeof EDITABLE_TEXT)[number];

export type ProjectEdit = Partial<Record<EditableText, string>> & {
  featured?: boolean;
  sort_order?: number;
  status?: Status;
  stack?: string[];
  highlights?: { kind: HighlightKind; text: string }[];
};

/**
 * Saves an edit from /admin. Every text field, the stack and the highlights that change are added to
 * edited_fields, so the sync never overwrites them. Runs in one transaction.
 */
export async function updateProject(id: number, edit: ProjectEdit) {
  const d = await getDb();
  const current = await getProjectById(id);
  if (!current) throw new Error("Project not found");

  const sets: string[] = [];
  const params: unknown[] = [id];
  const edited = new Set(current.edited_fields);
  for (const f of EDITABLE_TEXT) {
    const v = edit[f];
    if (v === undefined) continue;
    const value = f === "live_url" ? v.trim() || null : v.trim();
    if (value === (current as any)[f]) continue;
    params.push(value);
    sets.push(`${f} = $${params.length}`);
    edited.add(f);
  }
  for (const f of ["featured", "sort_order", "status"] as const) {
    if (edit[f] === undefined || edit[f] === (current as any)[f]) continue;
    params.push(edit[f]);
    sets.push(`${f} = $${params.length}`);
  }

  const stmts: Stmt[] = [];
  if (edit.stack && edit.stack.join("|") !== current.stack.join("|")) {
    stmts.push(...stackStmts(id, edit.stack));
    edited.add("stack");
  }
  if (edit.highlights && JSON.stringify(edit.highlights) !== JSON.stringify(current.highlights.map((h) => ({ kind: h.kind, text: h.text })))) {
    stmts.push(...highlightStmts(id, edit.highlights));
    edited.add("highlights");
  }
  params.push([...edited]);
  sets.push(`edited_fields = $${params.length}`, "updated_at = now()");
  // A project can be featured on its own only: featuring one un-features the rest.
  if (edit.featured) stmts.unshift({ text: `UPDATE ${t("projects")} SET featured = false WHERE id <> $1`, params: [id] });
  stmts.push({ text: `UPDATE ${t("projects")} SET ${sets.join(", ")} WHERE id = $1`, params });
  await d.tx(stmts);
}

export function highlightStmts(projectId: number, hs: { kind: HighlightKind; text: string }[]): Stmt[] {
  return [
    { text: `DELETE FROM ${t("highlights")} WHERE project_id = $1`, params: [projectId] },
    ...hs
      .filter((h) => h.text.trim())
      .map((h, i) => ({
        text: `INSERT INTO ${t("highlights")} (project_id, kind, text, sort) VALUES ($1,$2,$3,$4)`,
        params: [projectId, h.kind, h.text.trim(), i],
      })),
  ];
}

export async function addMedia(projectId: number, m: { kind: MediaKind; url: string; alt: string }) {
  const d = await getDb();
  await d.query(
    `INSERT INTO ${t("media")} (project_id, kind, url, alt, sort, source)
     VALUES ($1,$2,$3,$4,(SELECT COALESCE(max(sort)+1,0) FROM ${t("media")} WHERE project_id = $1),'manual')
     ON CONFLICT (project_id, url) DO UPDATE SET kind = EXCLUDED.kind, alt = EXCLUDED.alt`,
    [projectId, m.kind, m.url, m.alt],
  );
}

export async function deleteMedia(projectId: number, mediaId: number) {
  const d = await getDb();
  await d.query(`DELETE FROM ${t("media")} WHERE id = $1 AND project_id = $2`, [mediaId, projectId]);
}

// ---------- Drafts ----------

export type DraftPayload = {
  title: string;
  tagline: string;
  kind: string;
  problem: string;
  approach: string;
  role: string;
  highlights: { kind: HighlightKind; text: string }[];
  stack: string[];
};

export type Draft = {
  id: number;
  project_id: number;
  project_slug: string;
  project_title: string;
  project_status: Status;
  source_readme_sha: string;
  payload: DraftPayload;
  model: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const DRAFT_SELECT = () => `
  SELECT dr.*, p.slug AS project_slug, p.title AS project_title, p.status AS project_status
  FROM ${t("drafts")} dr JOIN ${t("projects")} p ON p.id = dr.project_id`;

const toDraft = (r: Row): Draft => ({
  ...(r as any),
  payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
  created_at: iso(r.created_at)!,
});

export async function listDrafts(status: Draft["status"] = "pending"): Promise<Draft[]> {
  const d = await getDb();
  return (await d.query(`${DRAFT_SELECT()} WHERE dr.status = $1 ORDER BY dr.created_at DESC`, [status])).map(toDraft);
}

export async function getDraft(id: number): Promise<Draft | null> {
  const d = await getDb();
  const [r] = await d.query(`${DRAFT_SELECT()} WHERE dr.id = $1`, [id]);
  return r ? toDraft(r) : null;
}

/** Applies a reviewed draft (after any edits in the form) to the project and marks the draft approved. */
export async function approveDraft(id: number, payload: DraftPayload, publish: boolean) {
  const draft = await getDraft(id);
  if (!draft || draft.status !== "pending") throw new Error("Draft is not pending");
  await updateProject(draft.project_id, {
    title: payload.title,
    tagline: payload.tagline,
    kind: payload.kind,
    problem: payload.problem,
    approach: payload.approach,
    role: payload.role,
    stack: payload.stack,
    highlights: payload.highlights,
    ...(publish ? { status: "published" as const } : {}),
  });
  const d = await getDb();
  await d.query(`UPDATE ${t("drafts")} SET status = 'approved', reviewed_at = now() WHERE id = $1`, [id]);
}

export async function rejectDraft(id: number) {
  const d = await getDb();
  await d.query(`UPDATE ${t("drafts")} SET status = 'rejected', reviewed_at = now() WHERE id = $1 AND status = 'pending'`, [id]);
}

// ---------- Contact and rate limits ----------

export async function insertContact(m: { name: string; email: string; message: string; ip_hash: string }): Promise<number> {
  const d = await getDb();
  const [r] = await d.query(
    `INSERT INTO ${t("contact_messages")} (name, email, message, ip_hash) VALUES ($1,$2,$3,$4) RETURNING id`,
    [m.name, m.email, m.message, m.ip_hash],
  );
  return r.id;
}

export async function markContactEmailed(id: number, error: string | null) {
  const d = await getDb();
  await d.query(
    `UPDATE ${t("contact_messages")} SET emailed_at = CASE WHEN $2::text IS NULL THEN now() END, email_error = $2 WHERE id = $1`,
    [id, error],
  );
}

export type ContactMessage = { id: number; name: string; email: string; message: string; emailed_at: string | null; email_error: string | null; created_at: string };

export async function listContacts(limit = 50): Promise<ContactMessage[]> {
  const d = await getDb();
  const rows = await d.query(
    `SELECT id, name, email, message, emailed_at, email_error, created_at FROM ${t("contact_messages")} ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({ ...(r as ContactMessage), emailed_at: iso(r.emailed_at), created_at: iso(r.created_at)! }));
}

/**
 * Fixed-window counter shared across serverless instances. One atomic upsert per hit; returns false once the
 * key has been used `limit` times in the current window.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number, now = Date.now()): Promise<boolean> {
  const d = await getDb();
  const windowStart = new Date(Math.floor(now / 1000 / windowSeconds) * windowSeconds * 1000).toISOString();
  const [r] = await d.query(
    `INSERT INTO ${t("rate_limits")} (key, window_start, count) VALUES ($1, $2, 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = ${t("rate_limits")}.count + 1
     RETURNING count`,
    [key, windowStart],
  );
  // Old windows are useless after they pass; clearing them here keeps the table tiny without a separate job.
  if (Math.random() < 0.05) await d.query(`DELETE FROM ${t("rate_limits")} WHERE window_start < now() - interval '1 day'`);
  return Number(r.count) <= limit;
}

// ---------- Sync runs ----------

export type SyncRun = {
  id: number;
  trigger: string;
  started_at: string;
  finished_at: string | null;
  repos_seen: number;
  repos_changed: number;
  drafts_created: number;
  error: string | null;
};

export async function listSyncRuns(limit = 10): Promise<SyncRun[]> {
  const d = await getDb();
  const rows = await d.query(`SELECT * FROM ${t("sync_runs")} ORDER BY started_at DESC LIMIT $1`, [limit]);
  return rows.map((r) => ({ ...(r as SyncRun), started_at: iso(r.started_at)!, finished_at: iso(r.finished_at) }));
}
