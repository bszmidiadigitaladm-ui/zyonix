"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function AcceptInviteButton({ token }: { token: string }) {
  const t = useTranslations("team.accept");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? tCommon("somethingWentWrong"));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <Button onClick={handleAccept} disabled={loading}>
        {loading ? t("accepting") : t("accept")}
      </Button>
    </div>
  );
}
