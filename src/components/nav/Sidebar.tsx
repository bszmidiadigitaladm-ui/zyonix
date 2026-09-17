"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  BookOpen,
  Palette,
  Layers,
  Mic,
  Clapperboard,
  Gamepad2,
  Sunrise,
  MessageCircle,
  LayoutTemplate,
  CreditCard,
  Users,
  HandHeart,
  Settings,
  Award,
  type LucideIcon,
} from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

const NAV_KEYS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/bible", key: "bible", icon: BookOpen },
  { href: "/art", key: "bibleArt", icon: Palette },
  { href: "/posts", key: "socialPosts", icon: Layers },
  { href: "/message", key: "messagePrep", icon: Mic },
  { href: "/video", key: "video", icon: Clapperboard },
  { href: "/games", key: "games", icon: Gamepad2 },
  { href: "/prayer", key: "prayer", icon: HandHeart },
  { href: "/badges", key: "badges", icon: Award },
  { href: "/devotionals", key: "devotional", icon: Sunrise },
  { href: "/chat", key: "spiritualChat", icon: MessageCircle },
  { href: "/templates", key: "templates", icon: LayoutTemplate },
  { href: "/billing", key: "planAndCredits", icon: CreditCard },
  { href: "/settings", key: "settings", icon: Settings },
] satisfies { href: string; key: string; icon: LucideIcon }[];

export function Sidebar({ showTeam }: { showTeam: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = showTeam ? [...NAV_KEYS, { href: "/team", key: "team" as const, icon: Users }] : NAV_KEYS;

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-border bg-surface/60 p-4">
      <Link href="/dashboard" className="mb-4 flex items-center gap-2 px-2 text-lg font-semibold">
        <Image src="/logo-mark.png" alt="" width={22} height={22} />
        {APP_NAME}
      </Link>
      {items.map((item) => {
        const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
              active
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-surface-raised hover:text-foreground",
            )}
          >
            <Icon size={17} strokeWidth={2} />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
