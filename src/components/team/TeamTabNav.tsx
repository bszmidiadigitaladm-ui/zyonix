"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/team", key: "tabWorkspace" },
  { href: "/team/contacts", key: "tabContacts" },
  { href: "/team/events", key: "tabEvents" },
  { href: "/team/communications", key: "tabCommunications" },
] as const;

export function TeamTabNav() {
  const t = useTranslations("team.workspace");
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
