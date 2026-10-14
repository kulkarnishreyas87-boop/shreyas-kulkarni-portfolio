import type { Project } from "@/lib/repo";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function LinksBar({ p }: { p: Project }) {
  return (
    <div className="links-bar">
      {p.live_url && <a className="btn btn-primary" href={p.live_url} target="_blank" rel="noreferrer">Open live app ↗</a>}
      {p.repo_url && <a className="btn" href={p.repo_url} target="_blank" rel="noreferrer">View code ↗</a>}
      <span className="meta">
        {p.live_note && <span>{p.live_note}</span>}
        {p.stars > 0 && <span>★ {p.stars}</span>}
        {p.last_commit_at && <span>Last commit {fmt(p.last_commit_at)}</span>}
      </span>
    </div>
  );
}
