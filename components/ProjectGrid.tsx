import type { ProjectSummary } from "@/lib/repo";
import { ProjectCard } from "./ProjectCard";

export function ProjectGrid({ projects }: { projects: ProjectSummary[] }) {
  if (!projects.length) return <div className="empty">No projects match.</div>;
  return (
    <div className="grid">
      {projects.map((p) => <ProjectCard key={p.slug} p={p} />)}
    </div>
  );
}
