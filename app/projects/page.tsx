import type { Metadata } from "next";
import { TechFilter } from "@/components/TechFilter";
import { listProjects } from "@/lib/repo";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Work", description: "Every project, filterable by stack." };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ tech?: string }> }) {
  const [{ tech }, projects] = await Promise.all([searchParams, listProjects()]);
  return (
    <section className="section container" style={{ paddingTop: 56 }}>
      <p className="eyebrow">Work</p>
      <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)" }}>Projects</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Each one is live or on GitHub with its code, and most come with a components map. Pick a technology to filter.
      </p>
      <TechFilter projects={projects} initial={tech ?? null} />
    </section>
  );
}
