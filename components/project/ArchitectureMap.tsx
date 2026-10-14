import type { Media } from "@/lib/repo";

/** The project's components map image. Opens full size in a new tab, because the maps are wide. */
export function ArchitectureMap({ items, title }: { items: Media[]; title: string }) {
  const maps = items.filter((m) => m.kind === "component_map");
  if (!maps.length) return null;
  return (
    <section className="case">
      <h2>Components map</h2>
      {maps.map((m) => (
        <figure className="map-frame" key={m.id} style={{ margin: "0 0 14px" }}>
          <a href={m.url} target="_blank" rel="noreferrer">
            <img src={m.url} alt={m.alt || `${title} components map`} loading="lazy" />
          </a>
          <figcaption>
            <span>{m.alt || "Components map"}</span>
            <a href={m.url} target="_blank" rel="noreferrer">Open full size ↗</a>
          </figcaption>
        </figure>
      ))}
    </section>
  );
}
