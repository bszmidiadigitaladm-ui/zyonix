import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Palette } from "lucide-react";
import { requireOnboardedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPlanLimits } from "@/lib/credits/config";
import { ART_STYLES, OUTPUT_FORMATS } from "@/lib/openai/art";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArtForm, type ArtFormInitial } from "@/components/art/ArtForm";

export default async function ArtPage({
  searchParams,
}: {
  searchParams: Promise<{ variation?: string }>;
}) {
  const t = await getTranslations("art");
  const { subscription } = await requireOnboardedUser();
  const { variation } = await searchParams;

  // Plans with reduced-quality art have that fixed, so only the others choose.
  const limits = subscription ? await getPlanLimits(subscription.plan_code) : null;
  const canChooseQuality = limits ? !limits.watermark : false;

  // "Create variation" from the gallery lands here with the source art's settings
  // filled in. Only rows the person can see (own or team) come back.
  let initial: ArtFormInitial | undefined;
  if (variation) {
    const supabase = await createClient();
    const { data: source } = await supabase
      .from("bible_art_generations")
      .select("id, verse_reference, theme, style, output_format")
      .eq("id", variation)
      .maybeSingle();
    if (source) {
      initial = {
        variationOf: source.id,
        verseReference: source.verse_reference ?? undefined,
        theme: source.theme ?? undefined,
        style: ART_STYLES.find((s) => s === source.style),
        format: OUTPUT_FORMATS.find((f) => f === source.output_format),
      };
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon={Palette}
        title={t("title")}
        actions={
          <Link href="/art/gallery" className="text-sm font-medium text-accent hover:underline">
            {t("viewGallery")}
          </Link>
        }
      />
      <ArtForm canChooseQuality={canChooseQuality} initial={initial} />
    </div>
  );
}
