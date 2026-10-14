"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { profile } from "@/data/profile";

const initials = profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2);

export function Navbar() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  if (path.startsWith("/admin")) return <AdminBar />;
  const cur = (p: string) => (path === p || (p !== "/" && path.startsWith(p)) ? "page" : undefined);
  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="container nav-inner">
        <Link href="/" className="brand" aria-label={`${profile.name}, home`}>
          <span className="brand-mark">{initials}</span>
          <span className="brand-name">{profile.name}</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          <Link href="/projects" aria-current={cur("/projects")}>Work</Link>
          <Link href="/about" aria-current={cur("/about")}>About</Link>
          <Link href="/#contact" className="hide-sm">Contact</Link>
          <a href={profile.links.github} target="_blank" rel="noreferrer" className="hide-sm">GitHub</a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function AdminBar() {
  return (
    <header className="nav scrolled">
      <div className="container nav-inner">
        <Link href="/admin" className="brand"><span className="brand-mark">A</span><span>Admin</span></Link>
        <nav className="nav-links">
          <Link href="/" target="_blank">View site ↗</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
