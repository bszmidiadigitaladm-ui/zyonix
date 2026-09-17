import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";

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
        <p className="mt-4 text-xs text-muted">{t("copyright", { year: new Date().getFullYear(), appName: APP_NAME })}</p>
      </div>
    </footer>
  );
}
