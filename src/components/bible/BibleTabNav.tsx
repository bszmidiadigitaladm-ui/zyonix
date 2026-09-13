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
    <div className="mb-6 flex gap-2 border-b border-border">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition",
              active ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </div>
  );
}
