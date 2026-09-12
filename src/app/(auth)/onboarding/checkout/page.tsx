"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/config";

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
          <p className="mb-6 text-sm text-neutral-500">
            Your payment went through, but activation is taking a little longer than usual.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Go to dashboard
          </button>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-xl font-semibold">Setting up your {APP_NAME} trial…</h1>
          <p className="text-sm text-neutral-500">This only takes a few seconds.</p>
        </>
      )}
    </div>
  );
}
