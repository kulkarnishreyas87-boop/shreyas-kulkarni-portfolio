import Link from "next/link";
import { listProjects } from "@/lib/repo";
import { isAdmin } from "@/lib/admin";
import { AdminShell } from "./shell";

export const dynamic = "force-dynamic";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const projects = (await isAdmin()) ? await listProjects({ all: true }) : [];
  return (
    <AdminShell tab="projects" msg={msg}>
      <p className="muted" style={{ marginBottom: 16 }}>
        New repos arrive <b>hidden</b>. Open one, check the write-up (or approve its Gemini draft) and set it to published.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Order</th><th>Project</th><th>Status</th><th>Stack</th><th>Live</th><th /></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.sort_order}{p.featured ? " ★" : ""}</td>
                <td><b>{p.title}</b><div className="hint">{p.tagline || "No write-up yet"}</div></td>
                <td><span className={`status ${p.status}`}>{p.status}</span></td>
                <td className="hint">{p.stack.slice(0, 4).join(", ")}{p.stack.length > 4 ? "…" : ""}</td>
                <td>{p.live_url ? <a href={p.live_url} target="_blank" rel="noreferrer">open ↗</a> : <span className="hint">none</span>}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <Link className="btn btn-sm" href={`/admin/projects/${p.id}`}>Edit</Link>
                  {p.status === "published" && <> <Link className="btn btn-sm" href={`/projects/${p.slug}`} target="_blank">View ↗</Link></>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
