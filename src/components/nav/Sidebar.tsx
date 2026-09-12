import Link from "next/link";
import { APP_NAME } from "@/lib/config";

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
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-neutral-200 p-4 dark:border-neutral-800">
      <Link href="/dashboard" className="mb-4 px-2 text-lg font-semibold">
        {APP_NAME}
      </Link>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          {item.label}
        </Link>
      ))}
      {showTeam && (
        <Link
          href="/team"
          className="rounded-md px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          Team
        </Link>
      )}
    </nav>
  );
}
