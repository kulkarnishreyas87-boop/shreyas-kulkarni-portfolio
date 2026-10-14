import { test } from "node:test";
import assert from "node:assert/strict";
import { freshDb } from "./helpers";
import { handleContact, CONTACT_LIMIT } from "../lib/contact";
import { listContacts } from "../lib/repo";
import { sendContactEmail } from "../lib/email";

const ok = { name: "Asha", email: "asha@example.com", message: "Hello, I would like to talk about a role." };

test("a valid message is stored even when email is not configured", async () => {
  delete process.env.RESEND_API_KEY;
  await freshDb();
  const out = await handleContact(ok, "ip1");
  assert.deepEqual(out, { ok: true, emailed: false });
  const [m] = await listContacts();
  assert.equal(m.email, "asha@example.com");
  assert.equal(m.emailed_at, null);
  assert.match(m.email_error!, /not configured/);
});

test("invalid fields come back per field", async () => {
  await freshDb();
  const out = await handleContact({ name: "", email: "nope", message: "short" }, "ip1");
  assert.equal(out.ok, false);
  if (!out.ok) {
    assert.equal(out.status, 400);
    assert.deepEqual(Object.keys(out.fields!).sort(), ["email", "message", "name"]);
  }
});

test("the honeypot silently drops bots", async () => {
  await freshDb();
  const out = await handleContact({ ...ok, website: "http://spam" }, "ip1");
  assert.equal(out.ok, true);
  assert.equal((await listContacts()).length, 0);
});

test("more than the limit per hour from one address is refused", async () => {
  await freshDb();
  for (let i = 0; i < CONTACT_LIMIT; i++) assert.equal((await handleContact(ok, "ip2")).ok, true);
  const out = await handleContact(ok, "ip2");
  assert.equal(out.ok, false);
  if (!out.ok) assert.equal(out.status, 429);
  assert.equal((await handleContact(ok, "ip3")).ok, true);
});

test("the Resend request carries reply-to and escapes HTML", async () => {
  process.env.RESEND_API_KEY = "test";
  process.env.CONTACT_TO = "me@example.com";
  let sent: any;
  const fake = (async (_url: string, init: any) => {
    sent = JSON.parse(init.body);
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  const r = await sendContactEmail({ name: "<b>x</b>", email: "a@b.co", message: "hi <script>" }, fake);
  assert.deepEqual(r, { sent: true, error: null });
  assert.equal(sent.reply_to, "a@b.co");
  assert.deepEqual(sent.to, ["me@example.com"]);
  assert.ok(!sent.html.includes("<script>"));
  delete process.env.RESEND_API_KEY;
  delete process.env.CONTACT_TO;
});
