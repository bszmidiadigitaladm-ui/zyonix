import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";
import { SUPPORT_EMAIL } from "@/lib/legal/content";
import { CookiePreferencesButton } from "@/components/analytics/CookiePreferencesButton";

export async function LandingFooter() {
  const t = await getTranslations("landing.footer");

  return (
    <footer className="border-t border-border px-6 py-10 text-center">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Image src="/logo-mark.png" alt="" width={18} height={18} />
          {APP_NAME}
        </div>
        <p className="text-xs text-muted">{t("tagline")}</p>
        <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted">
          <Link href="/terms" className="transition hover:text-foreground">
            {t("terms")}
          </Link>
          <Link href="/privacy" className="transition hover:text-foreground">
            {t("privacy")}
          </Link>
          <CookiePreferencesButton label={t("cookies")} />
          <a href={`mailto:${SUPPORT_EMAIL}`} className="transition hover:text-foreground">
            {t("contact")}
          </a>
        </nav>
        <p className="mt-4 text-xs text-muted">{t("copyright", { year: new Date().getFullYear(), appName: APP_NAME })}</p>
      </div>
    </footer>
  );
}
