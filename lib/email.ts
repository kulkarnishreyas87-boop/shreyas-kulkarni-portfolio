export type EmailResult = { sent: boolean; error: string | null };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Emails a contact message to CONTACT_TO through Resend's HTTP API, with reply-to set to the sender.
 * Without RESEND_API_KEY or CONTACT_TO it reports not sent; the message is already safe in Neon.
 */
export async function sendContactEmail(
  m: { name: string; email: string; message: string },
  fetcher: typeof fetch = fetch,
): Promise<EmailResult> {
  const key = (process.env.RESEND_API_KEY || "").trim();
  const to = (process.env.CONTACT_TO || "").trim();
  if (!key || !to) return { sent: false, error: "Email not configured (RESEND_API_KEY or CONTACT_TO missing)" };
  const from = (process.env.EMAIL_FROM || "Portfolio <onboarding@resend.dev>").trim();
  try {
    const res = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: m.email,
        subject: `Portfolio message from ${m.name}`,
        text: `${m.name} <${m.email}> wrote:\n\n${m.message}`,
        html: `<p><b>${escapeHtml(m.name)}</b> &lt;${escapeHtml(m.email)}&gt; wrote:</p><p style="white-space:pre-wrap">${escapeHtml(m.message)}</p>`,
      }),
    });
    if (!res.ok) return { sent: false, error: `Resend returned ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { sent: true, error: null };
  } catch (e) {
    return { sent: false, error: (e as Error).message };
  }
}
