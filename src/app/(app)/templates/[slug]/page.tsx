import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LayoutTemplate } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getTemplate } from "@/lib/templates/catalog";
import { PageHeader } from "@/components/ui/PageHeader";
import { PosterEditor } from "@/components/templates/PosterEditor";

export default async function TemplateEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireOnboardedUser();
  const template = getTemplate(slug);
  if (!template) notFound();
  const t = await getTranslations("templates");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={LayoutTemplate}
        title={template.name}
        actions={
          <Link href="/templates" className="text-sm font-medium text-accent hover:underline">
            {t("back")}
          </Link>
        }
      />
      <PosterEditor template={template} />
    </div>
  );
}
