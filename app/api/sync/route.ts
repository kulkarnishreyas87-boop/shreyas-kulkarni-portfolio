import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { timingSafeEqual } from "node:crypto";
import { isAdmin } from "@/lib/admin";
import { runSync } from "@/lib/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function cronAuthorized(req: Request): boolean {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Vercel Cron calls GET with the CRON_SECRET bearer token; the admin's "Sync now" posts with the session cookie. */
async function handle(req: Request, trigger: "cron" | "manual") {
  const ok = trigger === "cron" ? cronAuthorized(req) : await isAdmin();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runSync({ trigger });
  // Repo facts (stars, last commit, stack) show on public pages, so refresh them.
  revalidatePath("/", "layout");
  return NextResponse.json(result, { status: result.errors.length && !result.reposSeen ? 502 : 200 });
}

export const GET = (req: Request) => handle(req, "cron");
export const POST = (req: Request) => handle(req, "manual");
