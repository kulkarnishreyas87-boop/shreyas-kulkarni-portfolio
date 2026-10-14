import type { Project } from "@/lib/repo";

const COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#e6c42e", Python: "#3572a5", CSS: "#663399", HTML: "#e34c26",
  Shell: "#89e051", PowerShell: "#5391fe", PLpgSQL: "#336790", Makefile: "#427819",
};

/** Stack tags and GitHub's language split for the sidebar. */
export function RepoPanel({ p }: { p: Project }) {
  const langs = Object.entries(p.languages).sort((a, b) => b[1] - a[1]);
  const total = langs.reduce((s, [, n]) => s + n, 0);
  return (
    <aside className="aside">
      <div className="panel">
        <h3>Stack</h3>
        <ul className="chips">{p.stack.map((s) => <li className="chip" key={s}>{s}</li>)}</ul>
      </div>
      {total > 0 && (
        <div className="panel">
          <h3>Languages</h3>
          <div className="lang-bar" aria-hidden="true">
            {langs.map(([l, n]) => <span key={l} style={{ width: `${(n / total) * 100}%`, background: COLORS[l] ?? "var(--faint)" }} />)}
          </div>
          <ul className="lang-list">
            {langs.slice(0, 5).map(([l, n]) => (
              <li key={l}><i style={{ background: COLORS[l] ?? "var(--faint)" }} />{l}<span>{((n / total) * 100).toFixed(1)}%</span></li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
