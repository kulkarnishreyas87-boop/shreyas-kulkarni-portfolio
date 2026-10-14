"use client";
import { useState } from "react";

type State = { kind: "idle" | "sending" | "sent" | "error"; message?: string; fields?: Record<string, string> };

export function ContactForm() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        form.reset();
        setState({ kind: "sent" });
      } else {
        setState({ kind: "error", message: data.error || "Something went wrong.", fields: data.fields });
      }
    } catch {
      setState({ kind: "error", message: "Could not reach the server. Please try again." });
    }
  }

  const err = (f: string) => state.kind === "error" && state.fields?.[f];
  if (state.kind === "sent") {
    return (
      <div className="notice ok" role="status">
        Thanks, your message is in. I will reply to the email you gave.{" "}
        <button type="button" className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => setState({ kind: "idle" })}>Send another</button>
      </div>
    );
  }
  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <div className="form-grid two">
        <div className="field">
          <label htmlFor="cf-name">Name</label>
          <input id="cf-name" name="name" className="input" autoComplete="name" required maxLength={100} aria-invalid={!!err("name")} />
          {err("name") && <span className="field-error">{err("name")}</span>}
        </div>
        <div className="field">
          <label htmlFor="cf-email">Email</label>
          <input id="cf-email" name="email" type="email" className="input" autoComplete="email" required maxLength={200} aria-invalid={!!err("email")} />
          {err("email") && <span className="field-error">{err("email")}</span>}
        </div>
      </div>
      <div className="field">
        <label htmlFor="cf-message">Message</label>
        <textarea id="cf-message" name="message" className="textarea" required maxLength={4000} placeholder="A role, a project, or a question about something here." aria-invalid={!!err("message")} />
        {err("message") && <span className="field-error">{err("message")}</span>}
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="cf-website">Website</label>
        <input id="cf-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state.kind === "error" && !state.fields && <div className="notice err" role="alert">{state.message}</div>}
      <div><button className="btn btn-primary" disabled={state.kind === "sending"}>{state.kind === "sending" ? "Sending…" : "Send message"}</button></div>
    </form>
  );
}
