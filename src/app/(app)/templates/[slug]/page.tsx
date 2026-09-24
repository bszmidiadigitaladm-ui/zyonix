import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LayoutTemplate } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FONT_STYLES, TEMPLATE_FIELDS, getTemplate, type TemplateField } from "@/lib/templates/catalog";
import { toPosterFormat } from "@/lib/posters/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { PosterEditor, type PosterEditorInitial } from "@/components/templates/PosterEditor";

export default async function TemplateEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; format?: string }>;
}) {
  const { slug } = await params;
  const { from, format } = await searchParams;
  await requireOnboardedUser();
  const template = getTemplate(slug);
  if (!template) notFound();
  const t = await getTranslations("templates");

  // "Use again" from My posters reopens the editor with what was typed last time
  // (uploaded photos and logos are never stored, so those are added again).
  // Only rows this person can see (own or team) come back.
  let initial: PosterEditorInitial | undefined;
  if (from) {
    const supabase = await createClient();
    const { data: previous } = await supabase
      .from("poster_generations")
      .select("fields, options, instructions")
      .eq("id", from)
      .eq("template_slug", slug)
      .maybeSingle();

    if (previous) {
      const fields: Partial<Record<TemplateField, string>> = {};
      for (const key of TEMPLATE_FIELDS) {
        const value = previous.fields?.[key];
        if (value && template.fields.includes(key)) fields[key] = value;
      }
      const options = previous.options ?? {};
      initial = {
        fields,
        instructions: previous.instructions,
        colors: {
          background: options.background,
          text: options.text,
          accent: options.accent,
        },
        font: FONT_STYLES.find((f) => f.key === options.font)?.key ?? null,
        format: toPosterFormat(format ?? options.format),
      };
    }
  } else if (format) {
    initial = { format: toPosterFormat(format) };
  }

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
      <PosterEditor template={template} initial={initial} />
    </div>
  );
}
