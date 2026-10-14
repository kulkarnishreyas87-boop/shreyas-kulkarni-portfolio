import Image from "next/image";
import type { ProjectSummary } from "@/lib/repo";

// Stable hue per project, so a project without a screenshot still gets a distinct tile.
const hueOf = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

/** Local files in public/ go through Next's optimizer (resized, WebP); remote URLs from /admin are shown as-is. */
export function Shot({ url, alt, priority = false, sizes }: { url: string; alt: string; priority?: boolean; sizes: string }) {
  return url.startsWith("/") ? (
    <Image src={url} alt={alt} fill sizes={sizes} priority={priority} style={{ objectFit: "cover", objectPosition: "top left" }} />
  ) : (
    <img src={url} alt={alt} loading={priority ? "eager" : "lazy"} />
  );
}

/** The project's screenshot, or a generated title tile when there is none. Component maps are shown on the detail page. */
export function Cover({ project, priority = false, sizes = "(min-width: 1100px) 360px, (min-width: 720px) 45vw, 100vw" }: { project: ProjectSummary; priority?: boolean; sizes?: string }) {
  const shot = project.cover?.kind === "screenshot" ? project.cover : null;
  if (shot) {
    return (
      <div className="cover">
        <Shot url={shot.url} alt={shot.alt || `${project.title} screenshot`} priority={priority} sizes={sizes} />
      </div>
    );
  }
  const h = hueOf(project.slug);
  return (
    <div className="cover" aria-hidden="true">
      <div className="cover-tile" style={{ background: `linear-gradient(135deg, hsl(${h} 62% 42%), hsl(${(h + 40) % 360} 70% 28%))` }}>
        <svg viewBox="0 0 400 250" preserveAspectRatio="none">
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M0 ${40 + i * 24} C 120 ${10 + i * 26}, 260 ${90 + i * 20}, 400 ${30 + i * 25}`} stroke="#fff" strokeWidth="1" fill="none" />
          ))}
        </svg>
        <span className="ct-kind">{project.kind}</span>
        <span className="ct-title">{project.title}</span>
      </div>
    </div>
  );
}
