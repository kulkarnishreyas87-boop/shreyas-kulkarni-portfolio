import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, listProjects } from "@/lib/repo";
import { CaseStudy } from "@/components/project/CaseStudy";
import { Highlights } from "@/components/project/Highlights";
import { ArchitectureMap } from "@/components/project/ArchitectureMap";
import { Gallery } from "@/components/project/Gallery";
import { LinksBar } from "@/components/project/LinksBar";
import { RepoPanel } from "@/components/project/RepoPanel";

export const revalidate = 3600;
// Projects published after the build are rendered on first visit, then cached.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await listProjects()).map((p) => ({ slug: p.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const p = await getProject((await params).slug);
  if (!p) return { title: "Not found" };
  return { title: p.title, description: p.tagline, openGraph: { title: p.title, description: p.tagline } };
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const [p, all] = await Promise.all([getProject(slug), listProjects()]);
  if (!p) notFound();
  const i = all.findIndex((x) => x.slug === slug);
  const prev = i > 0 ? all[i - 1] : null;
  const next = i >= 0 && i < all.length - 1 ? all[i + 1] : null;

  return (
    <article className="container">
      <header className="detail-hero">
        <Link href="/projects" className="back">← All projects</Link>
        <p className="eyebrow">{p.kind}</p>
        <h1>{p.title}</h1>
        <p className="lede">{p.tagline}</p>
        <LinksBar p={p} />
      </header>

      <div className="detail-grid">
        <div>
          <CaseStudy p={p} />
          <div style={{ height: 36 }} />
          <Highlights items={p.highlights} />
          <div style={{ height: 36 }} />
          <ArchitectureMap items={p.media} title={p.title} />
          <Gallery items={p.media} />

          <nav className="next-nav" aria-label="More projects">
            {prev ? <Link href={`/projects/${prev.slug}`}><small>← Previous</small><b>{prev.title}</b></Link> : <span />}
            {next ? <Link href={`/projects/${next.slug}`} style={{ textAlign: "right" }}><small>Next →</small><b>{next.title}</b></Link> : <span />}
          </nav>
        </div>
        <RepoPanel p={p} />
      </div>
    </article>
  );
}
