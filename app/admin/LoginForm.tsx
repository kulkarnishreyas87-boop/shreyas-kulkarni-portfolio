"use client";
import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="pw">Password</label>
        <input id="pw" name="password" type="password" className="input" autoComplete="current-password" required autoFocus />
      </div>
      {error && <div className="notice err" role="alert">{error}</div>}
      <div><button className="btn btn-primary" disabled={pending}>{pending ? "Checking…" : "Sign in"}</button></div>
    </form>
  );
}
