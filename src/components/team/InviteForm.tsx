"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAcceptUrl(null);
    setLoading(true);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setAcceptUrl(data.accept_url);
      setEmail("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@church.org"
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Sending…" : "Create invite"}
        </Button>
      </form>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {acceptUrl && (
        <Card className="mt-3 text-sm">
          <p className="mb-1 text-muted">Share this link with your teammate:</p>
          <code className="break-all text-accent">{acceptUrl}</code>
        </Card>
      )}
    </div>
  );
}
