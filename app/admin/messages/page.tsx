import { listContacts } from "@/lib/repo";
import { isAdmin } from "@/lib/admin";
import { AdminShell } from "../shell";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const messages = (await isAdmin()) ? await listContacts() : [];
  return (
    <AdminShell tab="messages">
      <p className="muted" style={{ marginBottom: 16 }}>Every contact form message, saved before the email is sent. The latest 50.</p>
      {messages.length === 0 ? (
        <div className="empty">No messages yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>From</th><th>Message</th><th>Email</th><th>Received</th></tr></thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td><b>{m.name}</b><div><a href={`mailto:${m.email}`}>{m.email}</a></div></td>
                  <td style={{ whiteSpace: "pre-wrap", maxWidth: 520 }}>{m.message}</td>
                  <td>{m.emailed_at ? <span className="status published">sent</span> : <span className="status pending" title={m.email_error ?? ""}>not sent</span>}</td>
                  <td className="hint">{new Date(m.created_at).toLocaleString("en-GB")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
