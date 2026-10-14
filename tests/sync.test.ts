import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb } from "./helpers";
import { GitHub, type RepoFacts, type RepoInfo } from "../lib/github";
import { runSync } from "../lib/sync";
import { approveDraft, getProject, listDrafts, listProjects, updateProject, type DraftPayload } from "../lib/repo";

const DRAFT: DraftPayload = {
  title: "Brand New",
  tagline: "A brand new project that does a useful thing.",
  kind: "Web app",
  problem: "People had a problem that this solves well.",
  approach: "It uses Next.js and Neon to solve the problem simply.",
  role: "Built all of it.",
  highlights: [
    { kind: "feature", text: "Does one thing well" },
    { kind: "decision", text: "Chose Neon for storage" },
    { kind: "feature", text: "Loads fast on phones" },
  ],
  stack: ["Next.js", "Neon"],
};

const noNetwork = (async () => {
  throw new Error("no network in tests");
}) as unknown as typeof fetch;

/** A GitHub stand-in: repos and facts come from a map, a name in `fail` throws. */
class FakeGitHub extends GitHub {
  constructor(public repos: Record<string, Partial<RepoFacts>>, public fail = new Set<string>()) {
    super("", noNetwork);
  }
  async listRepos(): Promise<RepoInfo[]> {
    return Object.keys(this.repos).map((name) => this.info(name));
  }
  private info(name: string): RepoInfo {
    const r = this.repos[name];
    return {
      name,
      html_url: `https://github.com/me/${name}`,
      description: r.description ?? "",
      homepage: r.homepage ?? null,
      default_branch: "main",
      stars: r.stars ?? 0,
      forks: 0,
      primary_language: "TypeScript",
      pushed_at: "2026-10-01T00:00:00Z",
    };
  }
  async facts(_owner: string, repo: RepoInfo): Promise<RepoFacts> {
    if (this.fail.has(repo.name)) throw new Error("boom");
    const r = this.repos[repo.name];
    return { ...repo, languages: r.languages ?? { TypeScript: 100 }, readme: r.readme ?? null, stack: r.stack ?? [], componentMap: r.componentMap ?? null };
  }
}

const writer = async () => JSON.stringify(DRAFT);

test("a new repo becomes a hidden project with a Gemini draft; nothing reaches the public list", async () => {
  await freshDb({ seeded: true });
  const gh = new FakeGitHub({
    "brand-new": { readme: { sha: "r1", text: "# Brand new" }, stack: ["Next.js"], homepage: "https://bn.vercel.app", componentMap: "https://raw/x.png" },
  });
  const r = await runSync({ github: gh, owner: "me", writer });
  assert.deepEqual(r.created, ["brand-new"]);
  assert.equal(r.draftsCreated, 1);
  assert.equal((await listProjects()).length, 6);
  const p = (await getProject("brand-new", { includeUnpublished: true }))!;
  assert.equal(p.status, "hidden");
  assert.equal(p.live_url, "https://bn.vercel.app");
  assert.equal(p.media[0].kind, "component_map");

  // Running again with the same README makes no second draft.
  const again = await runSync({ github: gh, owner: "me", writer });
  assert.equal(again.draftsCreated, 0);
  assert.equal((await listDrafts()).length, 1);
});

test("approving a draft applies it, publishes it and marks the fields as edited", async () => {
  await freshDb({ seeded: true });
  await runSync({ github: new FakeGitHub({ "brand-new": { readme: { sha: "r1", text: "x" } } }), owner: "me", writer });
  const [draft] = await listDrafts();
  await approveDraft(draft.id, { ...draft.payload, tagline: "Edited before approval, still long enough." }, true);
  const p = (await getProject("brand-new"))!;
  assert.equal(p.status, "published");
  assert.equal(p.tagline, "Edited before approval, still long enough.");
  assert.equal(p.highlights.length, 3);
  assert.ok(p.edited_fields.includes("stack"));
  assert.equal((await listDrafts()).length, 0);
});

test("seeded projects take their first README as a baseline; a later README change makes a draft", async () => {
  await freshDb({ seeded: true });
  const gh = new FakeGitHub({ "pulse-ai": { readme: { sha: "a", text: "v1" }, stars: 4, stack: ["Next.js"] } });
  const first = await runSync({ github: gh, owner: "me", writer });
  assert.equal(first.draftsCreated, 0);
  const p = (await getProject("pulse-ai"))!;
  assert.equal(p.stars, 4);
  // The seeded stack is hand-written, so the detected one does not replace it.
  assert.ok(p.stack.includes("Vercel Cron"));

  gh.repos["pulse-ai"].readme = { sha: "b", text: "v2" };
  const second = await runSync({ github: gh, owner: "me", writer });
  assert.equal(second.reposChanged, 1);
  assert.equal(second.draftsCreated, 1);
  // The draft does not change the live write-up until approved.
  assert.equal((await getProject("pulse-ai"))!.title, "Pulse-AI");
});

test("a hand-edited live URL survives a sync; an unedited one follows the GitHub homepage", async () => {
  await freshDb({ seeded: true });
  await runSync({ github: new FakeGitHub({ "brand-new": { homepage: "https://one.app" } }), owner: "me", writer: null });
  const p = (await getProject("brand-new", { includeUnpublished: true }))!;
  assert.equal(p.live_url, "https://one.app");
  await updateProject(p.id, { live_url: "https://mine.app" });
  await runSync({ github: new FakeGitHub({ "brand-new": { homepage: "https://two.app" } }), owner: "me", writer: null });
  assert.equal((await getProject("brand-new", { includeUnpublished: true }))!.live_url, "https://mine.app");
});

test("one failing repo is recorded and the others still sync", async () => {
  await freshDb({ seeded: true });
  const gh = new FakeGitHub({ bad: {}, good: { stars: 2 } }, new Set(["bad"]));
  const r = await runSync({ github: gh, owner: "me", writer: null });
  assert.equal(r.reposSeen, 2);
  assert.deepEqual(r.created, ["good"]);
  assert.match(r.errors[0], /^bad: boom/);
});

test("a failed Gemini draft keeps the repo facts and is reported", async () => {
  await freshDb();
  const bad = async () => "not json";
  const r = await runSync({ github: new FakeGitHub({ x: { readme: { sha: "1", text: "x" }, stars: 3 } }), owner: "me", writer: bad });
  assert.deepEqual(r.created, ["x"]);
  assert.equal(r.draftsCreated, 0);
  assert.match(r.errors[0], /x: draft failed/);
  assert.equal((await getProject("x", { includeUnpublished: true }))!.stars, 3);
  // The next run retries the draft, because the README was never drafted.
  assert.equal((await runSync({ github: new FakeGitHub({ x: { readme: { sha: "1", text: "x" } } }), owner: "me", writer })).draftsCreated, 1);
});

test("the draft cap per run is respected", async () => {
  await freshDb();
  const repos: Record<string, Partial<RepoFacts>> = {};
  for (let i = 0; i < 5; i++) repos[`r${i}`] = { readme: { sha: `s${i}`, text: "x" } };
  const r = await runSync({ github: new FakeGitHub(repos), owner: "me", writer, maxDrafts: 2 });
  assert.equal(r.draftsCreated, 2);
  // The rest are drafted on the next run.
  assert.equal((await runSync({ github: new FakeGitHub(repos), owner: "me", writer, maxDrafts: 2 })).draftsCreated, 2);
});
