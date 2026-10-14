import { NextResponse } from "next/server";
import { clientIpHash } from "@/lib/admin";
import { handleContact } from "@/lib/contact";

export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 20_000) {
    return NextResponse.json({ error: "Message too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const out = await handleContact(body, await clientIpHash());
    if (out.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: out.error, fields: out.fields }, { status: out.status });
  } catch (e) {
    console.error("contact failed", e);
    return NextResponse.json({ error: "Could not save your message. Please try again." }, { status: 500 });
  }
}
