import { profile } from "@/data/profile";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>© {new Date().getFullYear()} {profile.name}</span>
        <span className="row">
          <a href={profile.links.github} target="_blank" rel="noreferrer">GitHub</a>
          {profile.links.linkedin && <a href={profile.links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
          {profile.links.cv && <a href={profile.links.cv}>CV</a>}
          <a href="/#contact">Contact</a>
        </span>
      </div>
    </footer>
  );
}
