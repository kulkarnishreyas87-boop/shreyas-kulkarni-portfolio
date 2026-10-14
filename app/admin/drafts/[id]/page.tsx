import { notFound } from "next/navigation";
import { getDraft, getProjectById } from "@/lib/repo";
import { isAdmin } from "@/lib/admin";
import { formatHighlights } from "@/lib/forms";
import { AdminShell } from "../../shell";
import { approveDraftAction, rejectDraftAction } from "../../actions";

export const dynamic = "force-dynamic";

/** Side by side: the live write-up on the left, Gemini's draft (editable) on the right. */
export default async function ReviewDraft({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await isAdmin())) return <AdminShell tab="drafts">{null}</AdminShell>;
  const d = await getDraft(Number(id));
  if (!d) notFound();
  const p = await getProjectById(d.project_id);
  if (!p) notFound();
  const fields: [keyof typeof d.payload & string, string, string, number][] = [
    ["title", "Title", p.title, 0],
    ["kind", "Kind", p.kind, 0],
    ["tagline", "Tagline", p.tagline, 70],
    ["problem", "The problem", p.problem, 110],
    ["approach", "How it works", p.approach, 200],
    ["role", "What I built", p.role, 90],
  ];

  return (
    <AdminShell tab="drafts">
      <h2 style={{ fontSize: 24, marginBottom: 6 }}>Draft for {p.title}</h2>
      <p className="hint" style={{ marginBottom: 22 }}>
        From README {d.source_readme_sha.slice(0, 7)} · {d.model} · {new Date(d.created_at).toLocaleString("en-GB")}
        {d.status !== "pending" && <> · <b>{d.status}</b></>}
      </p>
      <form action={approveDraftAction} className="form" style={{ gap: 18 }}>
        <input type="hidden" name="draft_id" value={d.id} />
        {fields.map(([key, label, current, h]) => (
          <div className="split" key={key}>
            <div className="field">
              <label>{label} · now</label>
              <div className="diff-old panel" style={{ minHeight: h || undefined }}>{current || <i>empty</i>}</div>
            </div>
            <div className="field">
              <label htmlFor={key}>{label} · draft</label>
              {h ? (
                <textarea id={key} name={key} className="textarea" defaultValue={d.payload[key] as string} style={{ minHeight: h }} />
              ) : (
                <input id={key} name={key} className="input" defaultValue={d.payload[key] as string} />
              )}
            </div>
          </div>
        ))}
        <div className="split">
          <div className="field"><label>Highlights · now</label><div className="diff-old panel mono" style={{ fontSize: 13 }}>{formatHighlights(p.highlights) || <i>empty</i>}</div></div>
          <div className="field"><label htmlFor="highlights">Highlights · draft</label><textarea id="highlights" name="highlights" className="textarea mono" style={{ fontSize: 13, minHeight: 160 }} defaultValue={formatHighlights(d.payload.highlights)} /></div>
        </div>
        <div className="split">
          <div className="field"><label>Stack · now</label><div className="diff-old panel">{p.stack.join(", ") || <i>empty</i>}</div></div>
          <div className="field"><label htmlFor="stack">Stack · draft</label><input id="stack" name="stack" className="input" defaultValue={d.payload.stack.join(", ")} /></div>
        </div>
        {d.status === "pending" && (
          <div className="row">
            <label className="check"><input type="checkbox" name="publish" defaultChecked={p.status !== "published"} /> Publish the project too</label>
            <button className="btn btn-primary">Approve draft</button>
            <button className="btn btn-danger" formAction={rejectDraftAction} formNoValidate>Reject</button>
          </div>
        )}
      </form>
    </AdminShell>
  );
}
