import { seedProjects, repoUrl } from "@/data/projects";
import { t, type Db, type Stmt } from "./client";
import { categoryOf } from "../stack";

/** Fields the seed counts as hand-written, so the GitHub sync never overwrites them. */
export const SEEDED_FIELDS = ["title", "tagline", "kind", "problem", "approach", "role", "next_steps", "live_url", "stack", "highlights"];

/**
 * Loads the six starting projects. A project whose slug already exists is left untouched, so running this
 * again (or after edits in /admin) never overwrites anything.
 */
export async function seed(d: Db): Promise<{ inserted: string[] }> {
  const inserted: string[] = [];
  for (const p of seedProjects) {
    const [row] = await d.query(
      `INSERT INTO ${t("projects")}
         (slug, repo_name, title, tagline, kind, problem, approach, role, next_steps, live_url, live_note, repo_url,
          featured, sort_order, status, edited_fields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'published',$15)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [p.slug, p.repo_name, p.title, p.tagline, p.kind, p.problem, p.approach, p.role, p.next_steps, p.live_url,
       p.live_note ?? "", repoUrl(p.repo_name), !!p.featured, p.sort_order, SEEDED_FIELDS],
    );
    if (!row) continue;
    const id = row.id as number;
    const stmts: Stmt[] = [
      ...stackStmts(id, p.stack),
      ...p.highlights.map((h, i) => ({
        text: `INSERT INTO ${t("highlights")} (project_id, kind, text, sort) VALUES ($1,$2,$3,$4)`,
        params: [id, h.kind, h.text, i],
      })),
      ...(p.media ?? []).map((m, i) => ({
        text: `INSERT INTO ${t("media")} (project_id, kind, url, alt, sort, source) VALUES ($1,$2,$3,$4,$5,'sync')
               ON CONFLICT (project_id, url) DO NOTHING`,
        params: [id, m.kind, m.url, m.alt, i],
      })),
    ];
    await d.tx(stmts);
    inserted.push(p.slug);
  }
  return { inserted };
}

/** Statements that replace a project's stack tags, creating any technology that does not exist yet. */
export function stackStmts(projectId: number, names: string[]): Stmt[] {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  return [
    { text: `DELETE FROM ${t("project_technologies")} WHERE project_id = $1`, params: [projectId] },
    ...clean.flatMap((name, i) => [
      { text: `INSERT INTO ${t("technologies")} (name, category) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING`, params: [name, categoryOf(name)] },
      {
        text: `INSERT INTO ${t("project_technologies")} (project_id, technology_id, sort)
               SELECT $1, id, $3 FROM ${t("technologies")} WHERE name = $2 ON CONFLICT DO NOTHING`,
        params: [projectId, name, i],
      },
    ]),
  ];
}
