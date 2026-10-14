// Runs the GitHub sync once from the terminal: npm run sync [-- --no-drafts]
import { dbSchema, getDb } from "../lib/db/client";
import { runSync } from "../lib/sync";

await getDb();
const noDrafts = process.argv.includes("--no-drafts");
const r = await runSync({ trigger: "cli", ...(noDrafts ? { writer: null } : {}) });
console.log(`Schema "${dbSchema()}": ${r.reposSeen} repos, ${r.reposChanged} changed, new: ${r.created.join(", ") || "none"}, drafts: ${r.draftsCreated}`);
if (r.errors.length) {
  console.error("Errors:\n" + r.errors.join("\n"));
  process.exitCode = 1;
}
