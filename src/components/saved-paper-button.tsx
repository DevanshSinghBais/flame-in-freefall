"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Check, LoaderCircle, Trash2 } from "lucide-react";

export type SavedPaperAccountState = "checking" | "signed-in" | "signed-out" | "unavailable";
type AccountState = SavedPaperAccountState;
type Props = { nasaId: string; accountState?: AccountState; initialSaved?: boolean; returnTo?: string };

export function SavedPaperButton({ nasaId, accountState, initialSaved = false, returnTo }: Props) {
  const [access, setAccess] = useState<AccountState>(accountState ?? "checking");
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (accountState) {
      setAccess(accountState);
      setSaved(initialSaved);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/library?ids=${encodeURIComponent(nasaId)}`, { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (response) => {
        if (response.status === 401) { setAccess("signed-out"); return; }
        if (!response.ok) { setAccess("unavailable"); return; }
        const payload = await response.json() as { savedIds?: string[] };
        setSaved(payload.savedIds?.includes(nasaId) ?? false);
        setAccess("signed-in");
      })
      .catch(() => { if (!controller.signal.aborted) setAccess("unavailable"); });
    return () => controller.abort();
  }, [accountState, initialSaved, nasaId]);

  async function toggleSaved() {
    setBusy(true);
    setMessage("");
    try {
      const response = saved
        ? await fetch(`/api/library?nasaId=${encodeURIComponent(nasaId)}`, { method: "DELETE" })
        : await fetch("/api/library", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nasaId }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (response.status === 401) { setAccess("signed-out"); return; }
      if (!response.ok) throw new Error(payload.error?.message ?? "The save could not be completed.");
      setSaved(!saved);
      setAccess("signed-in");
      setMessage(saved ? "Removed from your Paper Library." : "Saved to your Paper Library.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The save could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (access === "checking") return <span className="saved-paper-status" role="status"><LoaderCircle size={14} aria-hidden="true" /> Checking library</span>;
  if (access === "signed-out") return <Link className="saved-paper-link" href={`/sign-in?next=${encodeURIComponent(returnTo ?? "/workspace/paper-library")}`}><Bookmark size={14} aria-hidden="true" /> Sign in to save</Link>;
  if (access === "unavailable") return <span className="saved-paper-status" role="status">Library status unavailable</span>;

  return (
    <span className="saved-paper-control">
      <button className="saved-paper-button" type="button" onClick={toggleSaved} disabled={busy} aria-label={saved ? "Remove paper from Paper Library" : "Save paper to Paper Library"}>
        {busy ? <LoaderCircle size={14} aria-hidden="true" /> : saved ? <Check size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
        {busy ? "Saving…" : saved ? "Saved" : "Save paper"}
      </button>
      {message && <span className="sr-only" role="status">{message}</span>}
    </span>
  );
}
