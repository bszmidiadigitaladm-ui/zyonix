"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/art", label: "Bible Art" },
  { href: "/posts", label: "Social Posts" },
  { href: "/devotionals", label: "Devotional" },
  { href: "/chat", label: "Spiritual Chat" },
  { href: "/templates", label: "Templates" },
  { href: "/billing", label: "Plan & Credits" },
];

export function Sidebar({ showTeam }: { showTeam: boolean }) {
  const pathname = usePathname();
  const items = showTeam ? [...NAV_ITEMS, { href: "/team", label: "Team" }] : NAV_ITEMS;

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-border bg-surface/60 p-4">
      <Link href="/dashboard" className="mb-4 flex items-center gap-2 px-2 text-lg font-semibold">
        <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
        {APP_NAME}
      </Link>
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm transition",
              active
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-surface-raised hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
