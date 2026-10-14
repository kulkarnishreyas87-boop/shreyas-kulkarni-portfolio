"use client";
import { useFormStatus } from "react-dom";
import { syncNowAction } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary" disabled={pending}>{pending ? "Syncing… (up to a minute)" : "Sync now"}</button>;
}

export function SyncButton() {
  return <form action={syncNowAction}><Submit /></form>;
}
