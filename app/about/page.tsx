import type { Metadata } from "next";
import Link from "next/link";
import { profile } from "@/data/profile";
import { listProjects, listTechnologies } from "@/lib/repo";
import { StackStrip } from "@/components/StackStrip";

export const revalidate = 3600;
export const metadata: Metadata = { title: "About", description: profile.intro };

export default async function AboutPage() {
  const [projects, techs] = await Promise.all([listProjects(), listTechnologies()]);
  return (
    <>
      <section className="section container" style={{ paddingTop: 56 }}>
        <p className="eyebrow">About</p>
        <div className="about-grid">
          <div>
            <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)", marginBottom: 22 }}>{profile.name}</h1>
            <p className="lede" style={{ marginBottom: 22 }}>{profile.intro}</p>
            {profile.about.map((para, i) => <p key={i}>{para}</p>)}
            <div className="actions" style={{ marginTop: 24 }}>
              <Link href="/#contact" className="btn btn-primary">Get in touch</Link>
              <a href={profile.links.github} className="btn" target="_blank" rel="noreferrer">GitHub ↗</a>
              {profile.links.linkedin && <a href={profile.links.linkedin} className="btn" target="_blank" rel="noreferrer">LinkedIn ↗</a>}
              {profile.links.cv && <a href={profile.links.cv} className="btn">Download CV</a>}
            </div>
          </div>
          <div className="panel" style={{ alignSelf: "start" }}>
            <h3>Projects, newest first</h3>
            <ul className="lang-list" style={{ gap: 12 }}>
              {[...projects]
                .sort((a, b) => (b.last_commit_at ?? "").localeCompare(a.last_commit_at ?? ""))
                .map((p) => (
                  <li key={p.slug} style={{ alignItems: "baseline" }}>
                    <Link href={`/projects/${p.slug}`} style={{ textDecoration: "none", fontWeight: 500 }}>{p.title}</Link>
                    <span>{p.last_commit_at ? new Date(p.last_commit_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : p.kind}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="section container" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Skills</p>
        <h2 className="section-title" style={{ marginBottom: 28 }}>The stack, by what I have shipped</h2>
        <StackStrip techs={techs} />
      </section>
    </>
  );
}
