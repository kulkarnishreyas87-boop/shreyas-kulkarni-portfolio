"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, SESSION_HOURS, adminConfigured, clientIpHash, makeSession, passwordMatches, requireAdmin } from "@/lib/admin";
import {
  addMedia, approveDraft, deleteMedia, rateLimit, rejectDraft, updateProject,
  type DraftPayload, type MediaKind, type Status,
} from "@/lib/repo";
import { runSync } from "@/lib/sync";
import { parseHighlights, parseStack } from "@/lib/forms";

const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const refresh = () => revalidatePath("/", "layout");

export async function login(_: string | null, form: FormData): Promise<string | null> {
  if (!adminConfigured()) return "Admin is not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET.";
  if (!(await rateLimit(`login:${await clientIpHash()}`, 6, 900))) return "Too many attempts. Try again in 15 minutes.";
  if (!passwordMatches(str(form, "password"))) return "Wrong password.";
  (await cookies()).set(ADMIN_COOKIE, makeSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}

export async function saveProject(form: FormData) {
  await requireAdmin();
  const id = Number(str(form, "id"));
  const live = str(form, "live_url").trim();
  if (live && !/^https?:\/\//.test(live)) redirect(`/admin/projects/${id}?msg=${encodeURIComponent("Live URL must start with http(s)://")}`);
  await updateProject(id, {
    title: str(form, "title"),
    tagline: str(form, "tagline"),
    kind: str(form, "kind"),
    problem: str(form, "problem"),
    approach: str(form, "approach"),
    role: str(form, "role"),
    next_steps: str(form, "next_steps"),
    live_url: live,
    live_note: str(form, "live_note"),
    featured: form.get("featured") === "on",
    sort_order: Number(str(form, "sort_order")) || 100,
    status: str(form, "status") as Status,
    stack: parseStack(str(form, "stack")),
    highlights: parseHighlights(str(form, "highlights")),
  });
  refresh();
  redirect(`/admin/projects/${id}?msg=Saved`);
}

export async function addMediaAction(form: FormData) {
  await requireAdmin();
  const id = Number(str(form, "id"));
  const url = str(form, "url").trim();
  if (!/^(https?:\/\/|\/)/.test(url)) redirect(`/admin/projects/${id}?msg=${encodeURIComponent("Media URL must be https://… or a /path in public/")}`);
  await addMedia(id, { kind: str(form, "kind") as MediaKind, url, alt: str(form, "alt").trim() });
  refresh();
  redirect(`/admin/projects/${id}?msg=Media+added`);
}

export async function deleteMediaAction(form: FormData) {
  await requireAdmin();
  const id = Number(str(form, "id"));
  await deleteMedia(id, Number(str(form, "media_id")));
  refresh();
  redirect(`/admin/projects/${id}?msg=Media+removed`);
}

export async function approveDraftAction(form: FormData) {
  await requireAdmin();
  const id = Number(str(form, "draft_id"));
  const payload: DraftPayload = {
    title: str(form, "title"),
    tagline: str(form, "tagline"),
    kind: str(form, "kind"),
    problem: str(form, "problem"),
    approach: str(form, "approach"),
    role: str(form, "role"),
    stack: parseStack(str(form, "stack")),
    highlights: parseHighlights(str(form, "highlights")),
  };
  await approveDraft(id, payload, form.get("publish") === "on");
  refresh();
  redirect(`/admin?msg=${encodeURIComponent(form.get("publish") === "on" ? "Draft approved and published" : "Draft approved")}`);
}

export async function rejectDraftAction(form: FormData) {
  await requireAdmin();
  await rejectDraft(Number(str(form, "draft_id")));
  redirect("/admin?msg=Draft+rejected");
}

export async function syncNowAction() {
  await requireAdmin();
  const r = await runSync({ trigger: "manual" });
  refresh();
  const msg = `Sync finished: ${r.reposSeen} repos, ${r.reposChanged} changed, ${r.created.length} new, ${r.draftsCreated} drafts` +
    (r.errors.length ? `. ${r.errors.length} error(s), see Sync runs.` : ".");
  redirect(`/admin/sync?msg=${encodeURIComponent(msg)}`);
}
