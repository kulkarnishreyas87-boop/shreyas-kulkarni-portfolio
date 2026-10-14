import Link from "next/link";
import type { ProjectSummary } from "@/lib/repo";
import { Cover } from "./Cover";

export function LiveBadge({ p }: { p: ProjectSummary }) {
  return p.live_url ? (
    <span className="badge"><span className="dot" />{p.live_note || "Live"}</span>
  ) : (
    <span className="badge"><span className="dot off" />{p.live_note || "Code only"}</span>
  );
}

export function ProjectCard({ p, maxChips = 5 }: { p: ProjectSummary; maxChips?: number }) {
  const extra = p.stack.length - maxChips;
  return (
    <article className="card">
      <Cover project={p} />
      <div className="card-body">
        <div className="card-top">
          <span className="eyebrow" style={{ margin: 0 }}>{p.kind}</span>
          <LiveBadge p={p} />
        </div>
        <h3><Link href={`/projects/${p.slug}`}>{p.title}</Link></h3>
        <p>{p.tagline}</p>
        <ul className="chips" aria-label="Stack">
          {p.stack.slice(0, maxChips).map((s) => <li className="chip" key={s}>{s}</li>)}
          {extra > 0 && <li className="chip">+{extra}</li>}
        </ul>
        <div className="card-links">
          {p.live_url && <a href={p.live_url} target="_blank" rel="noreferrer">Live app ↗</a>}
          {p.repo_url && <a href={p.repo_url} target="_blank" rel="noreferrer">Code ↗</a>}
        </div>
      </div>
    </article>
  );
}
