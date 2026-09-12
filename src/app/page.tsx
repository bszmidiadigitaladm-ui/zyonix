import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { GlowBackdrop } from "@/components/ui/GlowBackdrop";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

export default async function HomePage() {
  const t = await getTranslations("landing");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <GlowBackdrop />
      <div className="absolute right-6 top-6 z-10">
        <LanguageSwitcher />
      </div>
      <div className="relative z-10 flex max-w-xl flex-col items-center gap-6">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{APP_NAME}</h1>
        <p className="max-w-md text-balance text-muted">{t("description")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup">
            <Button>{t("getStarted")}</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">{t("signIn")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
