import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function IconTile({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-gradient-to-b from-surface-raised/70 to-surface p-4 text-center transition hover:-translate-y-0.5 hover:border-accent/50"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon size={20} strokeWidth={2} />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
