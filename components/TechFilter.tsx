"use client";
import { useMemo, useState } from "react";
import type { ProjectSummary } from "@/lib/repo";
import { ProjectGrid } from "./ProjectGrid";

/** Filters the already-loaded list in the browser. The chosen tag is kept in the URL so a filtered view can be shared. */
export function TechFilter({ projects, initial }: { projects: ProjectSummary[]; initial: string | null }) {
  const tags = useMemo(() => {
    const count = new Map<string, number>();
    projects.forEach((p) => p.stack.forEach((s) => count.set(s, (count.get(s) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([s]) => s);
  }, [projects]);
  const [tech, setTech] = useState<string | null>(initial && tags.includes(initial) ? initial : null);
  const [showAll, setShowAll] = useState(false);

  const pick = (next: string | null) => {
    setTech(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("tech", next);
    else url.searchParams.delete("tech");
    window.history.replaceState(null, "", url);
  };
  const shown = tech ? projects.filter((p) => p.stack.includes(tech)) : projects;
  const visibleTags = showAll ? tags : tags.slice(0, 12);
  if (tech && !visibleTags.includes(tech)) visibleTags.push(tech);

  return (
    <>
      <div className="filter-bar" role="group" aria-label="Filter by technology">
        <button type="button" className="chip" aria-pressed={tech === null} onClick={() => pick(null)}>All</button>
        {visibleTags.map((s) => (
          <button type="button" key={s} className="chip" aria-pressed={tech === s} onClick={() => pick(tech === s ? null : s)}>{s}</button>
        ))}
        {tags.length > 12 && (
          <button type="button" className="chip" onClick={() => setShowAll(!showAll)}>{showAll ? "Fewer" : `+${tags.length - 12} more`}</button>
        )}
        <span className="count" aria-live="polite">{shown.length} of {projects.length}</span>
      </div>
      <ProjectGrid projects={shown} />
    </>
  );
}
