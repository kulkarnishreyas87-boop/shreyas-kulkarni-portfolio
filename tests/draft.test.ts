import { test } from "node:test";
import assert from "node:assert/strict";
import { draftFromReadme, buildPrompt } from "../lib/ai/draft";

const input = { repo: "x", description: "", homepage: null, detectedStack: ["Next.js"], readme: "# X", examples: [] };
const good = {
  title: "Xylo",
  tagline: "Does a useful thing for people.",
  kind: "Web app",
  problem: "A real problem that people have.",
  approach: "It works by doing the thing carefully.",
  role: "Built it.",
  highlights: [{ kind: "feature", text: "First one" }, { kind: "feature", text: "Second one" }, { kind: "metric", text: "Three users" }],
  stack: ["Next.js", "Next.js"],
};

test("invalid output is retried once with the reason, then accepted", async () => {
  const prompts: string[] = [];
  const answers = ["not json", JSON.stringify(good)];
  const out = await draftFromReadme(input, async (p) => {
    prompts.push(p);
    return answers.shift()!;
  });
  assert.equal(out.title, "Xylo");
  assert.deepEqual(out.stack, ["Next.js"]);
  assert.match(prompts[1], /previous answer was invalid/);
});

test("two invalid answers throw", async () => {
  await assert.rejects(draftFromReadme(input, async () => JSON.stringify({ title: "X" })), /invalid draft/);
});

test("the README is fenced as data and truncated", () => {
  const p = buildPrompt({ ...input, readme: "a".repeat(30000) });
  assert.match(p, /<<<README/);
  assert.ok(p.length < 26000);
});
