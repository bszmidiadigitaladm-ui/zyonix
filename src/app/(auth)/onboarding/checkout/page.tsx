"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/Button";

// Stripe redirects here right after Checkout. The webhook (source of truth)
// may land a beat later, so we poll briefly before sending the user in.
export default function OnboardingCheckoutStatusPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const timedOut = attempts > 10;

  useEffect(() => {
    if (timedOut) return;

    const timer = setTimeout(async () => {
      const res = await fetch("/api/credits/balance");
      const data = await res.json().catch(() => null);

      if (data?.subscription) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setAttempts((n) => n + 1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [attempts, timedOut, router]);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center">
      {timedOut ? (
        <>
          <h1 className="mb-2 text-xl font-semibold">Almost there</h1>
          <p className="mb-6 text-sm text-muted">
            Your payment went through, but activation is taking a little longer than usual.
          </p>
          <Button onClick={() => router.push("/dashboard")}>Go to dashboard</Button>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-xl font-semibold">Setting up your {APP_NAME} trial…</h1>
          <p className="text-sm text-muted">This only takes a few seconds.</p>
        </>
      )}
    </div>
  );
}
