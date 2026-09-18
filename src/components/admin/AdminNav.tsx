"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  HeartPulse,
  LayoutDashboard,
  Mail,
  ScrollText,
  ShieldCheck,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/pending", label: "Pending purchases", icon: Timer },
  { href: "/admin/crisis", label: "Crisis flags", icon: HeartPulse },
  { href: "/admin/communications", label: "Church emails", icon: Mail },
  { href: "/admin/usage", label: "AI usage", icon: Activity },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface/60 p-4">
      <div className="mb-4 flex items-center gap-2 px-2">
        <ShieldCheck size={20} className="text-danger" />
        <span className="text-lg font-semibold">Zyonix Admin</span>
      </div>

      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-raised hover:text-foreground",
            )}
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </Link>
        );
      })}

      <div className="mt-auto border-t border-border pt-4">
        <p className="truncate px-2 text-xs text-muted">{email}</p>
        <Link href="/dashboard" className="mt-2 flex items-center gap-2 px-2 text-xs text-muted transition hover:text-foreground">
          <ArrowLeft size={13} />
          Back to the app
        </Link>
      </div>
    </nav>
  );
}
