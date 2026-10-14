import Link from "next/link";
import type { TechCount } from "@/lib/repo";

const GROUPS: { title: string; cats: string[] }[] = [
  { title: "Frontend and languages", cats: ["frontend", "language"] },
  { title: "Backend and data", cats: ["backend", "database"] },
  { title: "AI", cats: ["ai"] },
  { title: "Infra and integrations", cats: ["infra", "integration", "other"] },
];

/** Every technology used by a published project, grouped, with how many projects use it. Each links to the filtered list. */
export function StackStrip({ techs }: { techs: TechCount[] }) {
  return (
    <div className="stack-groups">
      {GROUPS.map((g) => {
        const items = techs.filter((x) => g.cats.includes(x.category));
        if (!items.length) return null;
        return (
          <div className="stack-group" key={g.title}>
            <h3>{g.title}</h3>
            <ul>
              {items.slice(0, 8).map((x) => (
                <li key={x.name}>
                  <Link href={`/projects?tech=${encodeURIComponent(x.name)}`}>{x.name}</Link>
                  <span>{x.count} {x.count === 1 ? "project" : "projects"}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
