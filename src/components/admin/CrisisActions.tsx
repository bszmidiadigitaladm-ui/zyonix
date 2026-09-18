"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** Open the single flagged message (reason required, logged) and mark the flag reviewed. */
export function CrisisActions({ id, reviewed }: { id: string; reviewed: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [revealed, setRevealed] = useState<{ content: string; created_at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/crisis/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return null;
      }
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    const data = await call({ action: "reveal", reason: reason.trim() });
    if (data?.content) setRevealed({ content: data.content, created_at: data.created_at });
  }

  async function markReviewed() {
    const data = await call({ action: "mark_reviewed" });
    if (data?.ok) router.refresh();
  }

  return (
    <div className="flex min-w-72 flex-col gap-2">
      {!revealed ? (
        <div className="flex gap-2">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason to open (logged)" />
          <Button variant="secondary" className="shrink-0 px-4 py-1.5 text-xs" disabled={busy || reason.trim().length < 5} onClick={reveal}>
            Open message
          </Button>
        </div>
      ) : (
        <blockquote className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm whitespace-pre-wrap">{revealed.content}</blockquote>
      )}
      {!reviewed && (
        <div>
          <Button className="px-4 py-1.5 text-xs" disabled={busy} onClick={markReviewed}>
            Mark as reviewed
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
