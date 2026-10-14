import { listSyncRuns } from "@/lib/repo";
import { isAdmin } from "@/lib/admin";
import { githubUser } from "@/lib/github";
import { hasGemini } from "@/lib/ai/draft";
import { AdminShell } from "../shell";
import { SyncButton } from "./SyncButton";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function SyncPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const runs = (await isAdmin()) ? await listSyncRuns(15) : [];
  return (
    <AdminShell tab="sync" msg={msg}>
      <div className="panel" style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 6px" }}>
          Reads the public repos of <b>{githubUser()}</b>: stars, last commit, languages, stack from manifests and <code>docs/component-map.png</code>.
          Vercel Cron runs it daily at 02:00 UTC.
        </p>
        <p className="hint" style={{ margin: "0 0 14px" }}>
          GitHub token: {process.env.GITHUB_TOKEN ? "set" : "not set (60 requests an hour)"} · Gemini drafts: {hasGemini() ? "on" : "off (no GEMINI_API_KEY)"}
        </p>
        <SyncButton />
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Started</th><th>Trigger</th><th>Repos</th><th>Changed</th><th>Drafts</th><th>Result</th></tr></thead>
          <tbody>
            {runs.length === 0 && <tr><td colSpan={6} className="hint">No runs yet.</td></tr>}
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="hint">{new Date(r.started_at).toLocaleString("en-GB")}</td>
                <td className="mono">{r.trigger}</td>
                <td>{r.repos_seen}</td>
                <td>{r.repos_changed}</td>
                <td>{r.drafts_created}</td>
                <td style={{ whiteSpace: "pre-wrap", maxWidth: 480 }}>
                  {!r.finished_at ? <span className="status pending">running</span> : r.error ? <span className="field-error">{r.error}</span> : <span className="status published">ok</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
