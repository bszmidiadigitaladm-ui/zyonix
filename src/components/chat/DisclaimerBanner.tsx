"use client";

import { useTranslations } from "next-intl";
import { APP_NAME } from "@/lib/config";

export function DisclaimerBanner() {
  const t = useTranslations("chat");
  return (
    <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
      {t("disclaimer", { appName: APP_NAME })}
    </div>
  );
}
