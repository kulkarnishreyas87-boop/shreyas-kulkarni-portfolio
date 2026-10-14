import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb } from "./helpers";
import { seed } from "../lib/db/seed";
import { getProject, listProjects, listTechnologies, rateLimit, updateProject, addMedia } from "../lib/repo";

test("seed loads six published projects, featured first, and is safe to run twice", async () => {
  const d = await freshDb({ seeded: true });
  assert.deepEqual((await seed(d)).inserted, []);
  const ps = await listProjects();
  assert.equal(ps.length, 6);
  assert.equal(ps[0].slug, "aangan-phone-agent");
  assert.equal(ps.filter((p) => p.featured).length, 1);
  assert.ok(ps.every((p) => p.stack.length > 0));
  assert.equal(ps.find((p) => p.slug === "match-night")!.live_url, null);
});

test("project detail has highlights, media and stack in order", async () => {
  await freshDb({ seeded: true });
  const p = (await getProject("pulse-ai"))!;
  assert.equal(p.stack[0], "Next.js");
  assert.ok(p.highlights.length >= 3);
  assert.deepEqual(p.media.map((m) => m.kind), ["screenshot", "component_map"]);
  assert.equal(p.cover?.kind, "screenshot");
  // A project with only a component map uses it as the cover fallback (the card then shows a generated tile).
  assert.equal((await getProject("match-night"))!.cover, null);
  assert.equal(await getProject("nope"), null);
});

test("technology counts only include published projects", async () => {
  await freshDb({ seeded: true });
  const before = (await listTechnologies()).find((x) => x.name === "Gemini")!.count;
  const p = (await getProject("pulse-ai"))!;
  await updateProject(p.id, { status: "hidden" });
  const after = (await listTechnologies()).find((x) => x.name === "Gemini")!.count;
  assert.equal(after, before - 1);
  assert.equal(await getProject("pulse-ai"), null);
  assert.ok(await getProject("pulse-ai", { includeUnpublished: true }));
});

test("edits record edited fields; featuring one project un-features the others", async () => {
  await freshDb({ seeded: true });
  const p = (await getProject("settle-the-trip"))!;
  await updateProject(p.id, { tagline: "New tagline", featured: true, stack: ["JavaScript", "Supabase"], next_steps: p.next_steps });
  const after = (await getProject("settle-the-trip"))!;
  assert.equal(after.tagline, "New tagline");
  assert.deepEqual(after.stack, ["JavaScript", "Supabase"]);
  assert.ok(after.edited_fields.includes("tagline"));
  const featured = (await listProjects()).filter((x) => x.featured);
  assert.deepEqual(featured.map((x) => x.slug), ["settle-the-trip"]);
});

test("a screenshot becomes the cover ahead of the component map", async () => {
  await freshDb({ seeded: true });
  const p = (await getProject("match-night"))!;
  await addMedia(p.id, { kind: "component_map", url: "/maps/match.png", alt: "Map" });
  assert.equal((await getProject("match-night"))!.cover?.kind, "component_map");
  await addMedia(p.id, { kind: "screenshot", url: "/screenshots/match.png", alt: "Home" });
  assert.equal((await getProject("match-night"))!.cover?.url, "/screenshots/match.png");
});

test("rate limit allows N hits per window, then blocks, then resets next window", async () => {
  await freshDb();
  // Start of the current hour, so the table's own clean-up of day-old windows never touches these rows.
  const t0 = Math.floor(Date.now() / 3600_000) * 3600_000;
  for (let i = 0; i < 3; i++) assert.equal(await rateLimit("k", 3, 3600, t0 + i), true);
  assert.equal(await rateLimit("k", 3, 3600, t0 + 10), false);
  assert.equal(await rateLimit("k", 3, 3600, t0 + 3600_000), true);
});
