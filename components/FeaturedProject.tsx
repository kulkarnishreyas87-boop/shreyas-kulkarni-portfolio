import Link from "next/link";
import type { Project } from "@/lib/repo";
import { Cover } from "./Cover";
import { LiveBadge } from "./ProjectCard";

export function FeaturedProject({ p }: { p: Project }) {
  const map = p.media.find((m) => m.kind === "component_map");
  return (
    <article className="featured">
      {p.cover?.kind === "screenshot" || !map ? (
        <Cover project={p} priority />
      ) : (
        <div className="cover"><img src={map.url} alt={map.alt} /></div>
      )}
      <div className="featured-body">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="eyebrow" style={{ margin: 0 }}>Featured · {p.kind}</span>
          <LiveBadge p={p} />
        </div>
        <h3>{p.title}</h3>
        <p>{p.tagline}</p>
        <ul className="featured-highlights">
          {p.highlights.slice(0, 3).map((h) => <li key={h.id}>{h.text}</li>)}
        </ul>
        <ul className="chips" aria-label="Stack">
          {p.stack.slice(0, 8).map((s) => <li className="chip" key={s}>{s}</li>)}
        </ul>
        <div className="actions">
          <Link href={`/projects/${p.slug}`} className="btn btn-primary">Read the case study →</Link>
          {p.live_url && <a href={p.live_url} className="btn" target="_blank" rel="noreferrer">Live app ↗</a>}
        </div>
      </div>
    </article>
  );
}
