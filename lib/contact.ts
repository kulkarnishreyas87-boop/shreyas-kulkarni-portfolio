import { z } from "zod";
import { insertContact, markContactEmailed, rateLimit } from "./repo";
import { sendContactEmail } from "./email";

export const ContactSchema = z.object({
  name: z.string().trim().min(1, "Please add your name").max(100),
  email: z.string().trim().email("Please use a valid email").max(200),
  message: z.string().trim().min(10, "A little more detail, please (10+ characters)").max(4000),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().max(0).optional().or(z.literal("")),
});

export const CONTACT_LIMIT = 5;
export const CONTACT_WINDOW_S = 3600;

export type ContactOutcome =
  | { ok: true; emailed: boolean }
  | { ok: false; status: number; error: string; fields?: Record<string, string> };

/** Validate, rate limit, save to Neon first, then email. A failed email still counts as delivered. */
export async function handleContact(body: unknown, ipHash: string): Promise<ContactOutcome> {
  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    // A filled honeypot looks like success to the bot, and nothing is stored.
    if (fields.website) return { ok: true, emailed: false };
    return { ok: false, status: 400, error: "Please check the form", fields };
  }
  if (!(await rateLimit(`contact:${ipHash}`, CONTACT_LIMIT, CONTACT_WINDOW_S))) {
    return { ok: false, status: 429, error: "Too many messages from this address. Please try again in an hour." };
  }
  const { name, email, message } = parsed.data;
  const id = await insertContact({ name, email, message, ip_hash: ipHash });
  const sent = await sendContactEmail({ name, email, message });
  await markContactEmailed(id, sent.error);
  return { ok: true, emailed: sent.sent };
}
