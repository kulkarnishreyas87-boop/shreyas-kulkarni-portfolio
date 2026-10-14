import type { Highlight } from "@/lib/repo";

const LABEL = { feature: "Feature", decision: "Design decision", metric: "Number" } as const;

export function Highlights({ items }: { items: Highlight[] }) {
  if (!items.length) return null;
  return (
    <section className="case">
      <h2>Highlights</h2>
      <ul className="highlights">
        {items.map((h) => (
          <li key={h.id}>
            <span className={`hl-kind ${h.kind}`}>{LABEL[h.kind]}</span>
            <span>{h.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
