"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBadgeIcon } from "@/lib/badges/icons";
import type { Badge, UserBadge } from "@/lib/types/database.types";

export function BadgeGrid({ badges, earned }: { badges: Badge[]; earned: UserBadge[] }) {
  const t = useTranslations("badges");
  const earnedByCode = new Map(earned.map((e) => [e.badge_code, e.earned_at]));

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {badges.map((badge) => {
        const earnedAt = earnedByCode.get(badge.code);
        const Icon = getBadgeIcon(badge.icon_key);
        return (
          <div
            key={badge.code}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border p-5 text-center",
              earnedAt
                ? "border-accent/40 bg-gradient-to-b from-surface-raised/70 to-surface"
                : "border-border bg-surface opacity-50",
            )}
          >
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full",
                earnedAt ? "bg-accent-soft text-accent shadow-[0_0_24px_-10px_var(--accent)]" : "bg-surface-raised text-muted",
              )}
            >
              {earnedAt ? <Icon size={24} /> : <Lock size={20} />}
            </div>
            <p className="text-sm font-semibold">{badge.name}</p>
            <p className="text-xs text-muted">{badge.description}</p>
            {earnedAt && (
              <p className="text-[10px] uppercase tracking-wide text-accent">
                {t("earnedOn", { date: new Date(earnedAt).toLocaleDateString() })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
