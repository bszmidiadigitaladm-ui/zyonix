"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/bible", key: "tabRead" },
  { href: "/bible/plans", key: "tabPlans" },
  { href: "/bible/progress", key: "tabProgress" },
  { href: "/bible/resources", key: "tabResources" },
] as const;

export function BibleTabNav() {
  const t = useTranslations("bible");
  const pathname = usePathname();

  return (
    <div className="mb-6 inline-flex flex-wrap gap-1 rounded-full border border-border bg-surface p-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              active ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </div>
  );
}
