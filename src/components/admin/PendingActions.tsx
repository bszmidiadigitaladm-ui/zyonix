"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** Attach a waiting purchase to the account the buyer actually signed up with, or discard it. */
export function PendingActions({ id, paidWith }: { id: string; paidWith: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(paidWith);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const reasonOk = reason.trim().length >= 5;

  async function call(body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/pending/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" className="px-4 py-1.5 text-xs" onClick={() => setOpen(true)}>
        Resolve
      </Button>
    );
  }

  return (
    <div className="flex min-w-72 flex-col gap-2">
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" />
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Account email to attach to" />
      <div className="flex gap-2">
        <Button className="px-4 py-1.5 text-xs" disabled={busy || !reasonOk || !email} onClick={() => call({ action: "attach", email })}>
          Attach &amp; activate
        </Button>
        <Button
          variant="danger"
          className="px-4 py-1.5 text-xs"
          disabled={busy || !reasonOk}
          onClick={() => call({ action: "delete" }, "Discard this pending purchase? The buyer will not get the plan automatically.")}
        >
          Discard
        </Button>
        <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {message && <p className="text-xs text-danger">{message}</p>}
    </div>
  );
}
