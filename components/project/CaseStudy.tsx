import type { Project } from "@/lib/repo";

export function CaseStudy({ p }: { p: Project }) {
  const parts: [string, string][] = [
    ["The problem", p.problem],
    ["How it works", p.approach],
    ["What I built", p.role],
    ["What I would do next", p.next_steps],
  ];
  return (
    <div className="case">
      {parts.filter(([, body]) => body).map(([title, body]) => (
        <section key={title}>
          <h2>{title}</h2>
          {body.split(/\n{2,}/).map((para, i) => <p key={i} style={{ marginTop: i ? 12 : 0 }}>{para}</p>)}
        </section>
      ))}
    </div>
  );
}
