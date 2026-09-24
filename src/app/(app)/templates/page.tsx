import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LayoutTemplate } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { TemplateBrowser } from "@/components/templates/TemplateBrowser";

export default async function TemplatesPage() {
  await requireOnboardedUser();
  const t = await getTranslations("templates");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={LayoutTemplate}
        title={t("title")}
        actions={
          <Link href="/templates/mine" className="text-sm font-medium text-accent hover:underline">
            {t("myPosters")}
          </Link>
        }
      />
      <p className="mb-6 text-sm text-muted">{t("subtitle")}</p>
      <TemplateBrowser />
    </div>
  );
}
