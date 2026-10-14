import Link from "next/link";
import { listDrafts } from "@/lib/repo";
import { isAdmin } from "@/lib/admin";
import { AdminShell } from "../shell";

export const dynamic = "force-dynamic";

export default async function DraftsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const drafts = (await isAdmin()) ? await listDrafts("pending") : [];
  return (
    <AdminShell tab="drafts" msg={msg}>
      <p className="muted" style={{ marginBottom: 16 }}>Gemini drafts a write-up when a README changes. Nothing goes live until you approve it.</p>
      {drafts.length === 0 ? (
        <div className="empty">No drafts waiting. Run a GitHub sync after you update a README.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Project</th><th>Draft tagline</th><th>Created</th><th /></tr></thead>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id}>
                  <td><b>{d.project_title}</b> <span className={`status ${d.project_status}`}>{d.project_status}</span></td>
                  <td>{d.payload.tagline}</td>
                  <td className="hint">{new Date(d.created_at).toLocaleString("en-GB")}</td>
                  <td><Link className="btn btn-sm btn-primary" href={`/admin/drafts/${d.id}`}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
