import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";
import { LandingFooter } from "@/components/landing/LandingFooter";

// Shared shell for the public legal pages (/terms, /privacy). Deliberately
// lighter than the marketing header: no anchor nav, just a way back home.
export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("legal");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Image src="/logo-mark.png" alt="" width={24} height={24} />
            {APP_NAME}
          </Link>
          <Link href="/" className="text-sm text-muted transition hover:text-foreground">
            {t("backHome")}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">{children}</main>
      <LandingFooter />
    </div>
  );
}
