"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Shared fallback for route-level error boundaries. The digest matches the
 * server-side log line (see instrumentation.ts), so a user quoting it to
 * support pinpoints the exact failure.
 */
export function ErrorView({
  error,
  retry,
  fullScreen,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  fullScreen?: boolean;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={fullScreen ? "flex min-h-screen items-center justify-center px-6" : "flex items-center justify-center py-16"}>
      <Card className="w-full max-w-md text-center">
        <h1 className="mb-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="mb-6 text-sm text-muted">{t("body")}</p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => retry()}>{t("retry")}</Button>
          <Link href="/" className="text-sm text-muted transition hover:text-foreground">
            {t("home")}
          </Link>
        </div>
        {error.digest && <p className="mt-6 text-xs text-muted">{t("reference", { digest: error.digest })}</p>}
      </Card>
    </div>
  );
}
