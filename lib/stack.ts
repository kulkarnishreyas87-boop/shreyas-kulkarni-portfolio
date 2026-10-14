import type { TechCategory } from "@/data/projects";

/** Display name and category for every stack tag the site knows about. Unknown names fall back to "other". */
export const TECH_CATEGORIES: Record<string, TechCategory> = {
  "Next.js": "frontend",
  React: "frontend",
  "Tailwind CSS": "frontend",
  "Framer Motion": "frontend",
  HTML: "frontend",
  CSS: "frontend",
  TypeScript: "language",
  JavaScript: "language",
  Python: "language",
  "Node.js": "backend",
  WebSockets: "backend",
  Zod: "backend",
  Pydantic: "backend",
  FastAPI: "backend",
  Flask: "backend",
  Neon: "database",
  Postgres: "database",
  Supabase: "database",
  SQLite: "database",
  Gemini: "ai",
  "Google Search grounding": "ai",
  Claude: "ai",
  OpenAI: "ai",
  Vaani: "ai",
  Vercel: "infra",
  "Vercel Cron": "infra",
  "GitHub Actions": "infra",
  Resend: "integration",
  HubSpot: "integration",
  "Cal.com": "integration",
  "Telegram Bot API": "integration",
  "TMDB API": "integration",
  RapidAPI: "integration",
};

export const categoryOf = (name: string): TechCategory => TECH_CATEGORIES[name] ?? "other";

/** npm and PyPI package names mapped to stack tags. */
const DEP_TAGS: [RegExp, string[]][] = [
  [/^next$/, ["Next.js", "React"]],
  [/^react$/, ["React"]],
  [/^tailwindcss$|^@tailwindcss\//, ["Tailwind CSS"]],
  [/^framer-motion$|^motion$/, ["Framer Motion"]],
  [/^typescript$/, ["TypeScript"]],
  [/^ws$|^socket\.io/, ["WebSockets"]],
  [/^zod$/, ["Zod"]],
  [/^@neondatabase\/serverless$/, ["Neon", "Postgres"]],
  [/^pg$|^postgres$|^psycopg/, ["Postgres"]],
  [/^@supabase\/supabase-js$|^supabase$/, ["Supabase"]],
  [/^better-sqlite3$|^sqlite3$|^aiosqlite$/, ["SQLite"]],
  [/^@google\/genai$|^@google\/generative-ai$|^google-genai$|^google-generativeai$/, ["Gemini"]],
  [/^@anthropic-ai\/sdk$|^anthropic$/, ["Claude"]],
  [/^openai$/, ["OpenAI"]],
  [/^resend$/, ["Resend"]],
  [/^@vercel\//, ["Vercel"]],
  [/^pydantic$/, ["Pydantic"]],
  [/^fastapi$/, ["FastAPI"]],
  [/^flask$/i, ["Flask"]],
  [/^python-telegram-bot$|^aiogram$/, ["Telegram Bot API"]],
];

/** Stack tags implied by a list of package names. */
export function tagsFromDeps(deps: string[]): string[] {
  const out = new Set<string>();
  for (const dep of deps) for (const [re, tags] of DEP_TAGS) if (re.test(dep.toLowerCase())) tags.forEach((x) => out.add(x));
  return [...out];
}

/** Package names from a package.json body. */
export function depsFromPackageJson(body: string): string[] {
  try {
    const pkg = JSON.parse(body);
    return [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
  } catch {
    return [];
  }
}

/** Package names from pyproject.toml (PEP 621 dependencies array) or requirements.txt. */
export function depsFromPython(body: string): string[] {
  const names = new Set<string>();
  const block = body.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
  const lines = block ? block[1].split(/[,\n]/) : body.split("\n");
  for (const line of lines) {
    const m = line.trim().replace(/^["']/, "").match(/^([A-Za-z0-9_.\-]+)/);
    if (m && !line.trim().startsWith("#")) names.add(m[1].toLowerCase());
  }
  return [...names];
}

/** GitHub language names mapped to tags (only languages that matter on a portfolio). */
export function tagsFromLanguages(langs: Record<string, number>): string[] {
  const known: Record<string, string> = { TypeScript: "TypeScript", JavaScript: "JavaScript", Python: "Python" };
  return Object.keys(langs).filter((l) => known[l]).map((l) => known[l]);
}
