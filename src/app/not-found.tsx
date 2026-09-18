import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GlowBackdrop } from "@/components/ui/GlowBackdrop";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <GlowBackdrop />
      <Card className="relative z-10 w-full max-w-sm text-center">
        <p className="mb-2 bg-[image:var(--gradient-accent)] bg-clip-text text-5xl font-extrabold text-transparent">404</p>
        <h1 className="mb-2 text-xl font-semibold">{t("title")}</h1>
        <p className="mb-6 text-sm text-muted">{t("body")}</p>
        <Link href="/">
          <Button className="w-full">{t("home")}</Button>
        </Link>
      </Card>
    </div>
  );
}
