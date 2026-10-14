import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/repo";
import { isAdmin } from "@/lib/admin";
import { formatHighlights } from "@/lib/forms";
import { AdminShell } from "../../shell";
import { addMediaAction, deleteMediaAction, saveProject } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditProject({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const [{ id }, { msg }] = await Promise.all([params, searchParams]);
  if (!(await isAdmin())) return <AdminShell tab="projects">{null}</AdminShell>;
  const p = await getProjectById(Number(id));
  if (!p) notFound();
  const edited = (f: string) => (p.edited_fields.includes(f) ? <span className="hint"> · edited by hand, sync will not overwrite</span> : null);

  return (
    <AdminShell tab="projects" msg={msg}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontSize: 24 }}>{p.title}</h2>
        <div className="row">
          {p.repo_url && <a className="btn btn-sm" href={p.repo_url} target="_blank" rel="noreferrer">Repo ↗</a>}
          {p.status === "published" && <Link className="btn btn-sm" href={`/projects/${p.slug}`} target="_blank">View page ↗</Link>}
        </div>
      </div>

      <form action={saveProject} className="form" style={{ gap: 18 }}>
        <input type="hidden" name="id" value={p.id} />
        <div className="form-grid two">
          <div className="field"><label htmlFor="title">Title{edited("title")}</label><input id="title" name="title" className="input" defaultValue={p.title} required /></div>
          <div className="field"><label htmlFor="kind">Kind (2 to 4 words){edited("kind")}</label><input id="kind" name="kind" className="input" defaultValue={p.kind} /></div>
        </div>
        <div className="field"><label htmlFor="tagline">Tagline{edited("tagline")}</label><input id="tagline" name="tagline" className="input" defaultValue={p.tagline} maxLength={200} /></div>
        <div className="field"><label htmlFor="problem">The problem{edited("problem")}</label><textarea id="problem" name="problem" className="textarea" defaultValue={p.problem} style={{ minHeight: 90 }} /></div>
        <div className="field"><label htmlFor="approach">How it works{edited("approach")}</label><textarea id="approach" name="approach" className="textarea" defaultValue={p.approach} style={{ minHeight: 170 }} /></div>
        <div className="form-grid two">
          <div className="field"><label htmlFor="role">What I built{edited("role")}</label><textarea id="role" name="role" className="textarea" defaultValue={p.role} style={{ minHeight: 90 }} /></div>
          <div className="field"><label htmlFor="next_steps">What I would do next{edited("next_steps")}</label><textarea id="next_steps" name="next_steps" className="textarea" defaultValue={p.next_steps} style={{ minHeight: 90 }} /></div>
        </div>
        <div className="field">
          <label htmlFor="highlights">Highlights{edited("highlights")}</label>
          <textarea id="highlights" name="highlights" className="textarea mono" defaultValue={formatHighlights(p.highlights)} style={{ fontSize: 13.5 }} />
          <span className="hint">One per line, as <code>feature | text</code>, <code>decision | text</code> or <code>metric | text</code>.</span>
        </div>
        <div className="field">
          <label htmlFor="stack">Stack{edited("stack")}</label>
          <input id="stack" name="stack" className="input" defaultValue={p.stack.join(", ")} />
          <span className="hint">Comma separated, in display order.</span>
        </div>
        <div className="form-grid two">
          <div className="field"><label htmlFor="live_url">Live URL{edited("live_url")}</label><input id="live_url" name="live_url" className="input" defaultValue={p.live_url ?? ""} placeholder="https://…" /></div>
          <div className="field"><label htmlFor="live_note">Live note</label><input id="live_note" name="live_note" className="input" defaultValue={p.live_note} placeholder="e.g. Password protected" /></div>
        </div>
        <div className="row" style={{ gap: 20 }}>
          <div className="field" style={{ width: 160 }}>
            <label htmlFor="status">Status</label>
            <select id="status" name="status" className="select" defaultValue={p.status}>
              <option value="published">published</option>
              <option value="draft">draft</option>
              <option value="hidden">hidden</option>
            </select>
          </div>
          <div className="field" style={{ width: 120 }}>
            <label htmlFor="sort_order">Order</label>
            <input id="sort_order" name="sort_order" type="number" className="input" defaultValue={p.sort_order} />
          </div>
          <label className="check" style={{ marginTop: 24 }}><input type="checkbox" name="featured" defaultChecked={p.featured} /> Featured on the home page</label>
        </div>
        <div className="row"><button className="btn btn-primary">Save and refresh the site</button><Link className="btn" href="/admin">Cancel</Link></div>
      </form>

      <h2 style={{ fontSize: 22, margin: "48px 0 14px" }}>Media</h2>
      <div className="table-wrap" style={{ marginBottom: 18 }}>
        <table className="table">
          <thead><tr><th>Preview</th><th>Kind</th><th>Alt text</th><th>Source</th><th /></tr></thead>
          <tbody>
            {p.media.length === 0 && <tr><td colSpan={5} className="hint">No media yet.</td></tr>}
            {p.media.map((m) => (
              <tr key={m.id}>
                <td><a href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt="" style={{ width: 120, borderRadius: 6, border: "1px solid var(--line)" }} /></a></td>
                <td className="mono">{m.kind}</td>
                <td>{m.alt}</td>
                <td className="hint">{m.source}</td>
                <td>
                  <form action={deleteMediaAction}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="media_id" value={m.id} />
                    <button className="btn btn-sm btn-danger">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={addMediaAction} className="form-grid two" style={{ alignItems: "end" }}>
        <input type="hidden" name="id" value={p.id} />
        <div className="field"><label htmlFor="m-url">Image URL</label><input id="m-url" name="url" className="input" placeholder="https://… or /screenshots/file.png" required /></div>
        <div className="row" style={{ alignItems: "end" }}>
          <div className="field" style={{ width: 170 }}>
            <label htmlFor="m-kind">Kind</label>
            <select id="m-kind" name="kind" className="select" defaultValue="screenshot">
              <option value="screenshot">screenshot</option>
              <option value="component_map">component_map</option>
              <option value="video">video</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 160 }}><label htmlFor="m-alt">Alt text</label><input id="m-alt" name="alt" className="input" /></div>
          <button className="btn">Add</button>
        </div>
      </form>
      <p className="hint" style={{ marginTop: 8 }}>The first screenshot becomes the project&apos;s card image. Put files in <code>public/screenshots/</code> and use <code>/screenshots/name.png</code>.</p>
    </AdminShell>
  );
}
