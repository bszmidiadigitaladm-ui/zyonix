"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/Button";

// Stripe redirects here right after Checkout. The webhook (source of truth)
// may land a beat later, so we poll briefly before sending the user in.
export default function OnboardingCheckoutStatusPage() {
  const t = useTranslations("onboarding.checkout");
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
          <h1 className="mb-2 text-xl font-semibold">{t("almostThereTitle")}</h1>
          <p className="mb-6 text-sm text-muted">{t("almostThereBody")}</p>
          <Button onClick={() => router.push("/dashboard")}>{t("goToDashboard")}</Button>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-xl font-semibold">{t("settingUp", { appName: APP_NAME })}</h1>
          <p className="text-sm text-muted">{t("settingUpSubtitle")}</p>
        </>
      )}
    </div>
  );
}
