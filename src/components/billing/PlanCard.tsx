"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PlanCode } from "@/lib/config";

interface PlanCardProps {
  code: PlanCode;
  displayName: string;
  priceUsd: number;
  features: string[];
  highlighted?: boolean;
}

export function PlanCard({ code, displayName, priceUsd, features, highlighted }: PlanCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_code: code }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Something went wrong starting checkout.");
      }

      window.location.href = data.url;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function handleDevActivate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dev/fake-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_code: code }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong activating the dev plan.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        highlighted && "border-accent/60 shadow-[0_0_32px_-12px_var(--accent)]",
      )}
    >
      {highlighted && (
        <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-xs font-medium text-accent-foreground">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-semibold">{displayName}</h3>
      <p className="mt-1 text-3xl font-bold">
        ${priceUsd.toFixed(2)}
        <span className="text-sm font-normal text-muted">/mo</span>
      </p>
      <p className="mt-1 text-xs text-muted">3-day free trial, cancel anytime</p>

      <ul className="my-6 flex flex-1 flex-col gap-2 text-sm text-foreground/90">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-accent" aria-hidden>
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>

      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      <Button
        onClick={handleSelect}
        disabled={loading}
        variant={highlighted ? "primary" : "secondary"}
        className="w-full"
      >
        {loading ? "Starting trial…" : "Start free trial"}
      </Button>

      {process.env.NODE_ENV !== "production" && (
        <button
          onClick={handleDevActivate}
          disabled={loading}
          className="mt-2 rounded-full border border-dashed border-warning/50 px-3 py-2 text-xs font-medium text-warning disabled:opacity-50"
        >
          🛠️ Dev: activate without payment
        </button>
      )}
    </Card>
  );
}
