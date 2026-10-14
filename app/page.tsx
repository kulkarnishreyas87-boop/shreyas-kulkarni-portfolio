import Link from "next/link";
import { Hero } from "@/components/Hero";
import { FeaturedProject } from "@/components/FeaturedProject";
import { ProjectGrid } from "@/components/ProjectGrid";
import { StackStrip } from "@/components/StackStrip";
import { ContactForm } from "@/components/ContactForm";
import { getProject, listProjects, listTechnologies } from "@/lib/repo";

// Cached for an hour; publishing in /admin refreshes it straight away.
export const revalidate = 3600;

export default async function Home() {
  const [projects, techs] = await Promise.all([listProjects(), listTechnologies()]);
  const featuredSummary = projects.find((p) => p.featured) ?? projects[0];
  const featured = featuredSummary ? await getProject(featuredSummary.slug) : null;
  const rest = projects.filter((p) => p.slug !== featured?.slug);

  return (
    <>
      <Hero projectCount={projects.length} liveCount={projects.filter((p) => p.live_url).length} techCount={techs.length} />

      {featured && (
        <section className="section-tight container" aria-labelledby="featured-title">
          <h2 id="featured-title" className="sr-only">Featured project</h2>
          <FeaturedProject p={featured} />
        </section>
      )}

      <section className="section container" aria-labelledby="work-title">
        <p className="eyebrow">Selected work</p>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "end", marginBottom: 28 }}>
          <h2 id="work-title" className="section-title" style={{ margin: 0 }}>More projects</h2>
          <Link href="/projects" className="btn btn-sm">Filter by stack →</Link>
        </div>
        <ProjectGrid projects={rest} />
      </section>

      <section className="section container" aria-labelledby="stack-title" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Toolbox</p>
        <h2 id="stack-title" className="section-title">What I build with</h2>
        <p className="lede" style={{ marginBottom: 28 }}>Counted from the projects on this site, so it only lists what I have actually shipped.</p>
        <StackStrip techs={techs} />
      </section>

      <section id="contact" className="section container" aria-labelledby="contact-title" style={{ scrollMarginTop: 72 }}>
        <div className="contact">
          <div>
            <p className="eyebrow">Contact</p>
            <h2 id="contact-title" className="section-title">Let&apos;s talk</h2>
            <p className="lede">Hiring, collaborating, or curious how one of these works? Send a note and I will get back to you.</p>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
