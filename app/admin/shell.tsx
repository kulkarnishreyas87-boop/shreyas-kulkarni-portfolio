import Link from "next/link";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { listDrafts } from "@/lib/repo";
import { logout } from "./actions";
import { LoginForm } from "./LoginForm";

type Tab = "projects" | "drafts" | "messages" | "sync";

/** Wraps every admin page: login gate, tab bar and the one-line notice passed back as ?msg=. */
export async function AdminShell({ tab, msg, children }: { tab: Tab; msg?: string; children: React.ReactNode }) {
  if (!adminConfigured()) {
    return (
      <section className="admin container">
        <h1>Admin is not set up</h1>
        <p className="muted">Set <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code> (16+ characters) in <code>.env.local</code> or on Vercel, then reload.</p>
      </section>
    );
  }
  if (!(await isAdmin())) {
    return (
      <section className="admin container" style={{ maxWidth: 440 }}>
        <h1>Sign in</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Owner access to drafts, edits and sync.</p>
        <LoginForm />
      </section>
    );
  }
  const pending = (await listDrafts("pending")).length;
  const tabs: [Tab, string, string][] = [
    ["projects", "/admin", "Projects"],
    ["drafts", "/admin/drafts", `Drafts${pending ? ` (${pending})` : ""}`],
    ["messages", "/admin/messages", "Messages"],
    ["sync", "/admin/sync", "GitHub sync"],
  ];
  return (
    <section className="admin container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Portfolio admin</h1>
        <form action={logout}><button className="btn btn-sm">Sign out</button></form>
      </div>
      <nav className="admin-nav" aria-label="Admin">
        {tabs.map(([k, href, label]) => (
          <Link key={k} href={href} aria-current={k === tab ? "page" : undefined}>{label}</Link>
        ))}
      </nav>
      {msg && <div className="notice ok" role="status" style={{ marginBottom: 20 }}>{msg}</div>}
      {children}
    </section>
  );
}
