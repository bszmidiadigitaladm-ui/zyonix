import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { GlowBackdrop } from "@/components/ui/GlowBackdrop";

// Set as the "redirect URL after purchase" in Hotmart's checkout settings.
// Checkout doesn't require a Zyonix account first, so this covers the buyer
// who lands back here before the confirmation email (sent by the webhook)
// arrives.
export default async function WelcomePage() {
  const t = await getTranslations("welcome");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <GlowBackdrop />
      <Card className="relative z-10 w-full max-w-sm text-center">
        <Eyebrow className="mb-3 justify-center">{APP_NAME}</Eyebrow>
        <h1 className="mb-2 text-2xl font-semibold">{t("title")}</h1>
        <p className="mb-6 text-sm text-muted">{t("subtitle")}</p>
        <Link href="/signup">
          <Button className="w-full">{t("cta")}</Button>
        </Link>
        <Link href="/login" className="mt-4 block text-sm text-muted hover:text-foreground">
          {t("signInInstead")}
        </Link>
      </Card>
    </div>
  );
}
