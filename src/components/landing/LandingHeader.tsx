"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

const ANCHOR_LINKS = [
  { href: "#tools", key: "tools" },
  { href: "#compare", key: "compare" },
  { href: "#pricing", key: "pricing" },
  { href: "#faq", key: "faq" },
] as const;

export function LandingHeader() {
  const t = useTranslations("landing.nav");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Image src="/logo-mark.png" alt="" width={24} height={24} priority />
          {APP_NAME}
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {ANCHOR_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-foreground">
              {t(link.key)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher className="w-auto py-1.5 text-xs" />
          <Link href="/login" className="text-sm text-muted transition hover:text-foreground">
            {t("signIn")}
          </Link>
          <Link href="/signup">
            <Button>{t("getStarted")}</Button>
          </Link>
        </div>

        <button
          type="button"
          aria-label="Menu"
          className="text-foreground md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="flex flex-col gap-4 border-t border-border px-6 py-4 md:hidden">
          {ANCHOR_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted"
              onClick={() => setMenuOpen(false)}
            >
              {t(link.key)}
            </a>
          ))}
          <div className="flex items-center justify-between">
            <Link href="/login" className="text-sm text-muted">
              {t("signIn")}
            </Link>
            <LanguageSwitcher className="w-auto py-1.5 text-xs" />
          </div>
          <Link href="/signup">
            <Button className="w-full">{t("getStarted")}</Button>
          </Link>
        </div>
      )}
    </header>
  );
}
