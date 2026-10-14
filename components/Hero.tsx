import Link from "next/link";
import { profile } from "@/data/profile";

export function Hero({ projectCount, liveCount, techCount }: { projectCount: number; liveCount: number; techCount: number }) {
  return (
    <section className="hero container">
      <p className="eyebrow reveal">{profile.role}</p>
      <h1 className="reveal d1">
        I build products where <em>AI does the work</em> and code keeps it honest.
      </h1>
      <p className="lede reveal d2">{profile.intro}</p>
      <div className="hero-actions reveal d3">
        <Link href="/projects" className="btn btn-primary">See the work →</Link>
        <a href="#contact" className="btn">Get in touch</a>
        {profile.links.cv && <a href={profile.links.cv} className="btn">CV</a>}
        {profile.links.linkedin && <a href={profile.links.linkedin} className="btn" target="_blank" rel="noreferrer">LinkedIn ↗</a>}
        <a href={profile.links.github} className="btn" target="_blank" rel="noreferrer">GitHub ↗</a>
      </div>
      <div className="hero-stats reveal d3">
        <div className="stat"><b>{projectCount}</b><span>projects shipped</span></div>
        <div className="stat"><b>{liveCount}</b><span>live right now</span></div>
        <div className="stat"><b>{techCount}</b><span>tools in the stack</span></div>
      </div>
    </section>
  );
}
