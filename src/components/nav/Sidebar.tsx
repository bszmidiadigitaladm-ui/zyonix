"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

const NAV_KEYS = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/bible", key: "bible" },
  { href: "/art", key: "bibleArt" },
  { href: "/posts", key: "socialPosts" },
  { href: "/message", key: "messagePrep" },
  { href: "/video", key: "video" },
  { href: "/games", key: "games" },
  { href: "/devotionals", key: "devotional" },
  { href: "/chat", key: "spiritualChat" },
  { href: "/templates", key: "templates" },
  { href: "/billing", key: "planAndCredits" },
] as const;

export function Sidebar({ showTeam }: { showTeam: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = showTeam ? [...NAV_KEYS, { href: "/team", key: "team" as const }] : NAV_KEYS;

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
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
