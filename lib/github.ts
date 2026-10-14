import { depsFromPackageJson, depsFromPython, tagsFromDeps, tagsFromLanguages } from "./stack";

export type Fetch = typeof fetch;

export type RepoInfo = {
  name: string;
  html_url: string;
  description: string;
  homepage: string | null;
  default_branch: string;
  stars: number;
  forks: number;
  primary_language: string | null;
  pushed_at: string | null;
};

export type RepoFacts = RepoInfo & {
  languages: Record<string, number>;
  readme: { sha: string; text: string } | null;
  stack: string[];
  componentMap: string | null;
};

const API = "https://api.github.com";

export const githubUser = () => (process.env.GITHUB_USER || "kulkarnishreyas87-boop").trim();

export class GitHub {
  constructor(private token = (process.env.GITHUB_TOKEN || "").trim(), private fetcher: Fetch = fetch) {}

  private async get(path: string, accept = "application/vnd.github+json"): Promise<Response> {
    const headers: Record<string, string> = { Accept: accept, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "portfolio-sync" };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await this.fetcher(`${API}${path}`, { headers, cache: "no-store" });
    if (res.status === 403 || res.status === 429) {
      const reset = res.headers.get("x-ratelimit-reset");
      throw new Error(`GitHub rate limit hit${reset ? ` (resets ${new Date(Number(reset) * 1000).toISOString()})` : ""}. Set GITHUB_TOKEN.`);
    }
    return res;
  }

  private async json<T>(path: string): Promise<T | null> {
    const res = await this.get(path);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub ${path} returned ${res.status}`);
    return (await res.json()) as T;
  }

  /** The user's own public repos (no forks), most recently pushed first. */
  async listRepos(user = githubUser()): Promise<RepoInfo[]> {
    const rows = (await this.json<any[]>(`/users/${encodeURIComponent(user)}/repos?per_page=100&type=owner&sort=pushed`)) ?? [];
    return rows
      .filter((r) => !r.fork && !r.private)
      .map((r) => ({
        name: r.name,
        html_url: r.html_url,
        description: r.description ?? "",
        homepage: r.homepage || null,
        default_branch: r.default_branch || "main",
        stars: r.stargazers_count ?? 0,
        forks: r.forks_count ?? 0,
        primary_language: r.language ?? null,
        pushed_at: r.pushed_at ?? null,
      }));
  }

  /** Everything the sync stores for one repo: languages, README, stack tags and a component map image if present. */
  async facts(owner: string, repo: RepoInfo): Promise<RepoFacts> {
    const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo.name)}`;
    const [languages, readmeMeta, tree] = await Promise.all([
      this.json<Record<string, number>>(`${base}/languages`),
      this.json<{ sha: string; content: string; encoding: string }>(`${base}/readme`),
      this.json<{ tree: { path: string; type: string }[] }>(`${base}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`),
    ]);

    const readme = readmeMeta
      ? { sha: readmeMeta.sha, text: Buffer.from(readmeMeta.content, (readmeMeta.encoding as BufferEncoding) || "base64").toString("utf8") }
      : null;

    const paths = (tree?.tree ?? []).filter((n) => n.type === "blob" && !n.path.includes("node_modules/")).map((n) => n.path);
    // Manifests at the root or one folder down (e.g. web/package.json in a Python repo with a React dashboard).
    const manifests = paths.filter((p) => /^([^/]+\/)?(package\.json|pyproject\.toml|requirements\.txt)$/.test(p)).slice(0, 4);
    const deps: string[] = [];
    for (const p of manifests) {
      const res = await this.get(`${base}/contents/${p.split("/").map(encodeURIComponent).join("/")}`, "application/vnd.github.raw");
      if (!res.ok) continue;
      const body = await res.text();
      deps.push(...(p.endsWith("package.json") ? depsFromPackageJson(body) : depsFromPython(body)));
    }
    const stack = [...new Set([...tagsFromLanguages(languages ?? {}), ...tagsFromDeps(deps)])];
    if (repo.homepage && /vercel\.app/.test(repo.homepage)) stack.push("Vercel");

    const map = paths.find((p) => /^docs\/components?-map\.png$/i.test(p)) ?? null;
    const componentMap = map
      ? `https://raw.githubusercontent.com/${owner}/${repo.name}/${repo.default_branch}/${map}`
      : null;

    return { ...repo, languages: languages ?? {}, readme, stack: [...new Set(stack)], componentMap };
  }
}
