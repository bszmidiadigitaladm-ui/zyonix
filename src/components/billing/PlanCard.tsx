"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
    <div
      className={cn(
        "flex flex-col rounded-xl border p-6",
        highlighted
          ? "border-neutral-900 shadow-sm dark:border-white"
          : "border-neutral-200 dark:border-neutral-800",
      )}
    >
      <h3 className="text-lg font-semibold">{displayName}</h3>
      <p className="mt-1 text-3xl font-bold">
        ${priceUsd.toFixed(2)}
        <span className="text-sm font-normal text-neutral-500">/mo</span>
      </p>
      <p className="mt-1 text-xs text-neutral-500">3-day free trial, cancel anytime</p>

      <ul className="my-6 flex flex-1 flex-col gap-2 text-sm text-neutral-600 dark:text-neutral-300">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span aria-hidden>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSelect}
        disabled={loading}
        className={cn(
          "rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50",
          highlighted
            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
            : "border border-neutral-300 dark:border-neutral-700",
        )}
      >
        {loading ? "Starting trial…" : "Start free trial"}
      </button>

      {process.env.NODE_ENV !== "production" && (
        <button
          onClick={handleDevActivate}
          disabled={loading}
          className="mt-2 rounded-md border border-dashed border-amber-500 px-3 py-2 text-xs font-medium text-amber-700 disabled:opacity-50 dark:text-amber-400"
        >
          🛠️ Dev: activate without payment
        </button>
      )}
    </div>
  );
}
