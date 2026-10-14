import type { Media } from "@/lib/repo";
import { Shot } from "../Cover";

export function Gallery({ items }: { items: Media[] }) {
  const shots = items.filter((m) => m.kind === "screenshot" || m.kind === "video");
  if (!shots.length) return null;
  return (
    <section className="case" style={{ marginBottom: 36 }}>
      <h2>Screens</h2>
      <div className="gallery">
        {shots.map((m) => (
          <figure key={m.id}>
            {m.kind === "video" ? (
              <video src={m.url} controls preload="metadata" style={{ width: "100%", borderRadius: 10 }} />
            ) : (
              <a href={m.url} target="_blank" rel="noreferrer" className="cover" style={{ display: "block" }}>
                <Shot url={m.url} alt={m.alt} sizes="(min-width: 960px) 420px, 100vw" />
              </a>
            )}
            {m.alt && <figcaption>{m.alt}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}
