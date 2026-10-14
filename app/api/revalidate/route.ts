import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";

/** Admin only: refreshes every cached page (publishing from /admin already does this). */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, revalidated: true });
}
