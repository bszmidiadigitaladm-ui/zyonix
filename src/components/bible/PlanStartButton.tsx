"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export function PlanStartButton({ planId, started }: { planId: string; started: boolean }) {
  const t = useTranslations("bible");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bible/plans/${planId}/start`, { method: "POST" });
      const data = await res.json();
      const firstReading = data.day?.readings?.[0];

      if (firstReading) {
        router.push(`/bible/${firstReading.book}/${firstReading.chapter}?plan=${planId}`);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant={started ? "secondary" : "primary"}>
      {started ? t("continue") : t("start")}
    </Button>
  );
}
