import { test } from "node:test";
import assert from "node:assert/strict";
import { depsFromPackageJson, depsFromPython, tagsFromDeps, categoryOf } from "../lib/stack";
import { slugify, titleFromRepo } from "../lib/sync";
import { parseHighlights, formatHighlights, parseStack } from "../lib/forms";

test("package.json dependencies map to stack tags", () => {
  const deps = depsFromPackageJson(JSON.stringify({ dependencies: { next: "15", "@neondatabase/serverless": "1", "@google/genai": "1" }, devDependencies: { tailwindcss: "4" } }));
  assert.deepEqual(new Set(tagsFromDeps(deps)), new Set(["Next.js", "React", "Neon", "Postgres", "Gemini", "Tailwind CSS"]));
});

test("pyproject and requirements dependencies are parsed", () => {
  const py = `[project]\nname = "x"\ndependencies = [\n  "pydantic>=2",\n  "google-genai",\n  "python-telegram-bot[job-queue]~=21",\n]\n`;
  assert.deepEqual(new Set(tagsFromDeps(depsFromPython(py))), new Set(["Pydantic", "Gemini", "Telegram Bot API"]));
  assert.deepEqual(depsFromPython("# comment\nfastapi==0.1\nresend\n"), ["fastapi", "resend"]);
});

test("unknown technologies fall back to the other category", () => {
  assert.equal(categoryOf("Neon"), "database");
  assert.equal(categoryOf("Something New"), "other");
});

test("slugs and titles from repo names", () => {
  assert.equal(slugify("Meera-LinkedIn-Post-Generator"), "meera-linked-in-post-generator");
  assert.equal(slugify("Trip_Planner_MRS"), "trip-planner-mrs");
  assert.equal(titleFromRepo("kargo-hiring-dashboard"), "Kargo Hiring Dashboard");
  assert.equal(titleFromRepo("FlixMatch"), "Flix Match");
});

test("highlight and stack form fields round-trip", () => {
  const hs = parseHighlights("decision | Code holds the rules\nmetric|58 CVs\nPlain line");
  assert.deepEqual(hs, [
    { kind: "decision", text: "Code holds the rules" },
    { kind: "metric", text: "58 CVs" },
    { kind: "feature", text: "Plain line" },
  ]);
  assert.deepEqual(parseHighlights(formatHighlights(hs)), hs);
  assert.deepEqual(parseStack("Next.js, Neon,, Neon , Gemini"), ["Next.js", "Neon", "Gemini"]);
});
